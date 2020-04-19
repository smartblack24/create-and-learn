import { useQuery } from '@apollo/react-hooks';
import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Divider,
  Grid
} from '@material-ui/core';
import { Topic } from 'cl-common';
import { LinkProps } from 'next/link';
import React from 'react';
import { QueryArgs } from '../../../types';
import {
  SubjectListQuery,
  SubjectListQueryResult
} from '../../graphql/catalog-queries';
import { Course } from '../../graphql/data-models';
import NextMUIButton from '../next-mui-button';
import PreflightCheck from '../preflight-check';

interface Props {
  topics: Topic[];
  level: number;
  cta: string;
  getLinkProps: (course: Course) => LinkProps;
  onClick?: (evt: React.MouseEvent) => void;
}

export default function CourseListing(props: Props) {
  const queryResult = useQuery<SubjectListQueryResult, QueryArgs.Subjects>(
    SubjectListQuery,
    {
      variables: {
        ids: props.topics
      }
    }
  );

  if (!queryResult.data) {
    return (
      <PreflightCheck loading={queryResult.loading} error={queryResult.error} />
    );
  }

  return (
    <Grid container justify="center" spacing={6}>
      {queryResult.data.subjects.map(subject => {
        const course = subject.courses.find(c => c.level === props.level);

        if (!course) {
          return null;
        }

        let hours = 0;
        switch (course.subjectId) {
          case Topic.AI:
          case Topic.DS:
            hours = 10;
            break;
          case Topic.ROBO:
          case Topic.MC:
            hours = 20;
            break;
          case Topic.WEB:
          case Topic.PY:
            hours = 40;
            break;
        }

        return (
          <Grid key={subject.id} item xs={12} sm={6} md={4}>
            <Card>
              <CardMedia
                image={subject.thumbnail}
                style={{ height: 0, paddingTop: '62.5%' }}
              />
              <CardHeader
                title={subject.name}
                subheader={
                  <>
                    <div>Grades {course.grades.join('-')}</div>
                    {hours > 0
                      ? `${hours}+ hours of coding experiences required`
                      : 'No prior experiences required'}
                  </>
                }
              />
              <Divider />
              <CardContent>{subject.headline}</CardContent>
              <CardActions>
                <NextMUIButton
                  color="primary"
                  variant="contained"
                  fullWidth
                  onClick={props.onClick}
                  next={props.getLinkProps(course)}
                >
                  {props.cta}
                </NextMUIButton>
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
