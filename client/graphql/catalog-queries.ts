import gql from 'graphql-tag';
import {
  ClassLite,
  ClassLiteFragment,
  Course,
  CourseFragment,
  CourseWithSubject,
  CourseWithSubjectFragment,
  SubjectWithCourses,
  SubjectWithCoursesFragment
} from './data-models';

export const GetCourseQuery = gql`
  ${CourseWithSubjectFragment}
  query($id: ID!) {
    course(id: $id) {
      ...CourseWithSubjectFragment
    }
  }
`;

export interface GetCourseQueryResult {
  course: CourseWithSubject;
}

export const GetSubjectQuery = gql`
  ${SubjectWithCoursesFragment}
  query($id: ID!) {
    subject(id: $id) {
      ...SubjectWithCoursesFragment
    }
  }
`;

export interface GetSubjectQueryResult {
  subject: SubjectWithCourses;
}

export const SubjectListQuery = gql`
  ${SubjectWithCoursesFragment}
  query($ids: [ID]) {
    subjects(ids: $ids) {
      ...SubjectWithCoursesFragment
    }
  }
`;

export interface SubjectListQueryResult {
  subjects: SubjectWithCourses[];
}

export const CourseListQuery = gql`
  ${CourseFragment}
  ${ClassLiteFragment}
  query($subjectIds: [ID]!, $level: Int!) {
    courses(subjectIds: $subjectIds, level: $level) {
      ...CourseFragment
      upcomingClasses {
        ...ClassLiteFragment
      }
    }
  }
`;

export interface CourseWithClasses extends Course {
  upcomingClasses: ClassLite[];
}

export interface CourseListResult {
  courses: CourseWithClasses[];
}
