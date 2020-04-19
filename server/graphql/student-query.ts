import {
  AttendanceModel,
  ClassModel,
  SessionModel,
  StudentModel,
  SubjectModel,
  TeacherModel
} from 'cl-models';

interface Seat {
  id: string;
  idx: number;
  class: ClassModel;
  startDate: Date;
  endDate: Date;
  added?: boolean;
  attended?: boolean;
}

export default {
  async parent(s: StudentModel) {
    return s.parent || s.getParent();
  },

  async projects(s: StudentModel) {
    return s.getProjects({
      order: [['createdAt', 'DESC']],
      include: [SubjectModel]
    });
  },

  async registrations(s: StudentModel) {
    const enrollments = await s.getEnrollments({
      order: [
        [ClassModel, 'startDate', 'DESC'],
        [ClassModel, SessionModel, 'idx', 'ASC']
      ],
      include: [
        {
          model: ClassModel,
          include: [TeacherModel]
        }
      ]
    });

    const addons = await s.getAddons({
      order: [
        [ClassModel, 'startDate', 'DESC'],
        [ClassModel, SessionModel, 'idx', 'ASC']
      ],
      include: [
        {
          model: ClassModel,
          include: [TeacherModel]
        }
      ]
    });

    const attendances = await AttendanceModel.findAll({
      where: {
        studentId: s.id
      }
    });

    return enrollments.map(er => {
      const seats: Seat[] = er.class.sessions.map(ses => {
        const addon = addons.find(
          addon => addon.originalClassId === ses.classId && addon.idx === ses.idx
        );

        if (addon) {
          ses = addon.class.sessions[ses.idx];
        }

        const attendance = attendances.find(att => att.sessionId === ses.id);

        return {
          id: ses.id + s.id,
          idx: ses.idx,
          class: addon ? addon.class : er.class,
          startDate: ses.startDate,
          endDate: ses.endDate,
          added: !!addon,
          attended: attendance ? attendance.attended : null
        };
      });

      return {
        id: er.id,
        class: er.class,
        seats
      };
    });
  },

  async enrollments(s: StudentModel) {
    return s.getEnrollments({
      order: [[ClassModel, 'startDate', 'DESC']],
      include: [
        {
          model: ClassModel,
          include: [TeacherModel]
        }
      ]
    });
  }
};
