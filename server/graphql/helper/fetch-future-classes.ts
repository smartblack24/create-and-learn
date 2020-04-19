import { ClassModel, CourseModel, EnrollmentModel } from 'cl-models';
import { Includeable, Op, WhereOptions } from 'sequelize';

export default async function queryUpcomingClasses(args) {
  const now = new Date();

  const include: Includeable[] = [EnrollmentModel];
  const where: WhereOptions = {
    active: true,
    endDate: {
      [Op.gt]: now
    },
    startDate: {
      [Op.gt]: args.startDate || now
    }
  };

  if (args.courseId) {
    where.courseId = args.courseId;
  } else if (args.subjectId) {
    include.push({
      model: CourseModel,
      required: true,
      where: {
        subjectId: args.subjectId
      }
    });
  }

  const klasses = await ClassModel.findAll({
    order: [['startDate', 'ASC']],
    include,
    where
  });

  return klasses.filter(k => k.schedules.length > 0);
}
