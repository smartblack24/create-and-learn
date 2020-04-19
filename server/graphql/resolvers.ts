import { defaultAvatarUrl } from 'cl-common';
import { CourseModel, SubjectModel, TeacherModel } from 'cl-models';
import { Request } from 'express';
import { GraphQLDate, GraphQLDateTime } from 'graphql-iso-date';
import { getSubject } from '../lib/catalog-cache';
import ClassQuery from './class-query';
import fetchFutureClasses from './helper/fetch-future-classes';
import { getUpgradeOffer } from './helper/promo-helper';
import editProfile from './mutation/edit-profile';
import { enrollClass, enrollTrial } from './mutation/enroll-class';
import { inviteFriend } from './mutation/manage-contacts';
import {
  cancelEnrollment,
  rescheduleEnrollment
} from './mutation/manage-enrollments';
import { forgotPassword, resetPassword } from './mutation/manage-passwords';
import { addProject, deleteProject, editProject } from './mutation/manage-projects';
import { addStudent, editStudent, removeStudent } from './mutation/manage-students';
import signIn from './mutation/sign-in';
import { signUp } from './mutation/sign-up';
import RootQuery from './root-query';
import StudentQuery from './student-query';
import UserQuery from './user-query';

export default {
  Date: GraphQLDate,
  DateTime: GraphQLDateTime,
  Query: RootQuery,
  Class: ClassQuery,
  User: UserQuery,
  Student: StudentQuery,

  Subject: {
    courses(s: SubjectModel) {
      return s.courses.filter(c => c.level >= 0);
    }
  },

  Course: {
    subject(c: CourseModel) {
      return getSubject(c);
    },

    async upcomingClasses(c: CourseModel) {
      return fetchFutureClasses({ courseId: c.id });
    },

    async offer(c: CourseModel, args: any, req: Request) {
      if (!req.userId || !c.isRegular) {
        return null;
      }

      return getUpgradeOffer(req.userId, c);
    }
  },

  Teacher: {
    avatar(t: TeacherModel) {
      return t.avatar || defaultAvatarUrl;
    }
  },

  Mutation: {
    signIn,
    signUp,
    editProfile,
    addStudent,
    editStudent,
    removeStudent,
    enrollClass,
    enrollTrial,
    cancelEnrollment,
    rescheduleEnrollment,
    resetPassword,
    forgotPassword,
    inviteFriend,
    addProject,
    editProject,
    deleteProject
  }
};
