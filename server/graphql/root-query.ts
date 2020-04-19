import Boom from 'boom';
import { CouponType, Topic, tzOpts } from 'cl-common';
import {
  ArticleModel,
  ClassModel,
  EnrollmentModel,
  ProjectModel,
  PromotionModel,
  SessionModel,
  StudentModel,
  UserModel
} from 'cl-models';
import { Request } from 'express';
import { DateTime } from 'luxon';
import { FindOptions, Op, QueryTypes } from 'sequelize';
import { listedTopics } from '../../shared/constants';
import { CourseIdVars, IDVars, QueryArgs } from '../../types';
import { sendExpiredCouponAlert } from '../emails/sendgrid';
import { getCourseById, getSubjectById, getSubjects } from '../lib/catalog-cache';
import logger from '../lib/logger';
import { getUploadUrl } from '../lib/s3-utils';
import sequelize from '../sequelize';
import fetchFutureClasses from './helper/fetch-future-classes';
import { getQualifiedClass } from './helper/promo-helper';

export default {
  async user(root, args, req: Request) {
    return req.userId ? UserModel.scope('children').findByPk(req.userId) : null;
  },

  async referer(root, args: QueryArgs.Referer) {
    const user = await UserModel.findOne({
      rejectOnEmpty: true,
      where: {
        referralCode: args.code
      }
    });

    return {
      id: user.id,
      firstName: user.firstName,
      email: user.email,
      referralCode: user.referralCode,
      subjects: getSubjects([Topic.SN, Topic.AI, Topic.ROBO])
    };
  },

  student(root, args: IDVars, req: Request) {
    if (req.userId) {
      return StudentModel.findOne({
        where: {
          id: args.id,
          parentId: req.userId
        }
      });
    }
  },

  maker(root, args: IDVars) {
    return StudentModel.findByPk(args.id, {
      order: [[ProjectModel, 'createdAt', 'DESC']],
      include: [
        {
          model: ProjectModel,
          required: false,
          where: {
            published: true
          }
        }
      ]
    });
  },

  async articlesStats() {
    return sequelize.query<{ month: Date; count: number }>(
      `SELECT last_day(createdAt) month, count(id) count
      FROM ${ArticleModel.tableName}
      WHERE published = $1 AND createdAt < $2
      GROUP BY month
      ORDER BY month DESC`,
      {
        type: QueryTypes.SELECT,
        bind: [true, new Date()]
      }
    );
  },

  async articles(root, args: QueryArgs.Articles) {
    const queryOpts: FindOptions = {
      order: [['createdAt', 'DESC']]
    };

    if (args.limit > 0) {
      queryOpts.limit = args.limit;
    }
    if (args.offset > 0) {
      queryOpts.offset = args.offset;
    }

    const now = new Date();

    if (args.selectedMonth) {
      const dt = DateTime.fromISO(args.selectedMonth, tzOpts);
      const start = dt.startOf('month').toJSDate();
      const end = dt.endOf('month').toJSDate();

      if (start < now) {
        queryOpts.where = {
          published: true,
          createdAt: {
            [Op.between]: [start, end > now ? now : end]
          }
        };
      }
    }

    if (!queryOpts.where) {
      queryOpts.where = {
        published: true,
        createdAt: {
          [Op.lt]: now
        }
      };
    }

    return ArticleModel.findAll(queryOpts);
  },

  class(root: any, args: IDVars) {
    return ClassModel.findByPk(args.id, {
      rejectOnEmpty: true,
      include: [EnrollmentModel]
    });
  },

  classes(root: any, args) {
    return fetchFutureClasses(args);
  },

  async rescheduleCandidates(root: any, args: CourseIdVars) {
    const course = getCourseById(args.courseId);

    const classes = await ClassModel.findAll({
      order: [['startDate', 'ASC']],
      where: {
        active: true,
        courseId: args.courseId,
        startDate: {
          [Op.gt]: new Date()
        }
      },
      include: [
        {
          model: EnrollmentModel,
          attributes: ['id']
        }
      ]
    });

    return classes.filter(cls => cls.enrollments.length < course.capacity);
  },

  async addonCandidates(root: any, args: QueryArgs.AddonCandidates) {
    return SessionModel.findAll({
      order: [
        ['startDate', 'ASC'],
        [ClassModel, SessionModel, 'idx', 'ASC']
      ],
      where: {
        idx: args.idx,
        startDate: {
          [Op.gt]: new Date()
        }
      },
      include: [
        {
          model: ClassModel,
          required: true,
          where: {
            active: true,
            courseId: args.courseId
          },
          include: [
            {
              model: EnrollmentModel,
              required: true,
              attributes: ['id']
            }
          ]
        }
      ]
    });
  },

  async promotion(root, args: QueryArgs.Promotion, req: Request) {
    if (!req.userId) {
      return null;
    }

    const promo = await PromotionModel.findOne({
      where: {
        code: args.code.trim()
      }
    });

    if (!promo) {
      logger.warn({ userId: req.userId }, 'coupon not found: %s', args.code);
      throw Boom.badRequest('Not a valid promo code', {
        code: 'This coupon code is invalid'
      });
    }

    logger.info({ userId: req.userId }, 'coupon found: %o', promo.toJSON());

    if (!promo.isValid) {
      throw Boom.badRequest('Not a valid promo code', {
        code: 'This coupon code has expired'
      });
    }

    if (promo.firstTimerOnly) {
      const user = await UserModel.findByPk(req.userId);
      if (!user || user.paid) {
        await sendExpiredCouponAlert(req.session.identity, promo);
        throw Boom.badRequest('Not a valid promo code', {
          code: 'This coupon cannot be used for this class'
        });
      }
    }

    if (promo.isLevelUp) {
      const qualified = await getQualifiedClass(
        req.userId,
        getCourseById(args.courseId)
      );
      if (!qualified) {
        await sendExpiredCouponAlert(req.session.identity, promo);
        throw Boom.badRequest('Not a valid promo code', {
          code: 'This coupon cannot be used for this class'
        });
      }
    }

    return promo;
  },

  subject(root, args: IDVars) {
    return getSubjectById(args.id);
  },

  subjects(root, args: QueryArgs.Subjects) {
    return getSubjects(args.ids || listedTopics);
  },

  course(root, args: IDVars) {
    return getCourseById(args.id);
  },

  courses(root, args: QueryArgs.Courses) {
    const subjects = getSubjects(args.subjectIds);
    return subjects.map(subject =>
      subject.courses.find(c => c.level === args.level)
    );
  },

  userUpload(root, args: QueryArgs.UserUpload, req: Request) {
    if (!req.userId) {
      throw Boom.unauthorized('Requires login');
    }

    return getUploadUrl(req.userId, {
      name: args.name,
      type: args.type
    });
  }
};
