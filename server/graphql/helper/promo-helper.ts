import { Topic, upgradeExpiration } from 'cl-common';
import {
  ClassModel,
  CourseModel,
  EnrollmentModel,
  PromotionModel,
  StudentModel,
  UserModel
} from 'cl-models';
import config from 'config';
import { DateTime } from 'luxon';
import { Op } from 'sequelize';
import logger from '../../lib/logger';

const trialCoupons = config.get('levelups.trial') as Record<Topic, string>;
const paidCoupons = config.get('levelups.regular') as Record<Topic, string>;

export async function getUpgradeOffer(userId: string, course: CourseModel) {
  const klass = await getQualifiedClass(userId, course);
  if (!klass) {
    return null;
  }

  logger.info(
    `%s ending at %s qualifies upgrade offer`,
    klass.courseId,
    klass.endDate
  );

  let code = '';

  if (klass.course.isTrial) {
    code = trialCoupons[course.subjectId];
  } else {
    code = paidCoupons[course.subjectId];
  }

  if (!code) {
    return null;
  }

  const promo = await PromotionModel.findOne({
    where: {
      code
    }
  });

  if (promo && promo.isValid) {
    return promo;
  }

  return null;
}

export async function getPromotionIfQualified(
  promotionId: string,
  user: UserModel,
  course: CourseModel
): Promise<PromotionModel> {
  const promo = await PromotionModel.findByPk(promotionId);

  if (!promo || !promo.isValid) {
    return null;
  }

  if (promo.firstTimerOnly && user.paid) {
    return null;
  }

  if (promo.isLevelUp) {
    const qualified = await getQualifiedClass(user.id, course);
    if (!qualified) {
      return null;
    }
  }

  return promo;
}

export async function getQualifiedClass(userId: string, course: CourseModel) {
  if (!course.isRegular) {
    return null;
  }

  const trialDeadline = DateTime.local()
    .minus({ days: upgradeExpiration.trialToPay })
    .startOf('day')
    .toJSDate();

  const paidDeadline = DateTime.local()
    .minus({ days: upgradeExpiration.levelup })
    .startOf('day')
    .toJSDate();

  const prevEnrollments = await EnrollmentModel.findAll({
    include: [
      {
        model: StudentModel,
        required: true,
        where: {
          parentId: userId
        }
      },
      {
        model: ClassModel,
        include: [CourseModel],
        required: true,
        where: {
          startDate: {
            [Op.lt]: new Date()
          }
        }
      }
    ]
  });

  const result = prevEnrollments.find(er => {
    if (er.class.course.isTrial) {
      // attending an introductory class within 3 days in the same subject
      return (
        er.class.course.subjectId === course.subjectId &&
        er.class.endDate > trialDeadline &&
        er.statusCode > 0
      );
    }

    if (er.class.course.isRegular) {
      if (er.class.course.subjectId === course.subjectId) {
        // paid lower level class within 14days
        return (
          er.class.course.level < course.level && er.class.endDate > paidDeadline
        );
      } else {
        // jump from other paid class
        return course.level === 1 && er.class.endDate > paidDeadline;
      }
    }

    return false;
  });

  return result?.class;
}
