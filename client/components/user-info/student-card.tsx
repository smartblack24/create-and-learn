import {
  Avatar,
  Button,
  Card,
  CardHeader,
  CardMedia,
  IconButton
} from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
import { MoreVert } from '@material-ui/icons';
import { defaultAvatarUrl } from 'cl-common';
import React from 'react';
import { defaultCoverUrl } from '../../../shared/constants';
import { Student } from '../../graphql/data-models';
import DeleteStudentModal from './delete-student-modal';
import EditCoverModal from './edit-cover-modal';
import EditStudentModal from './edit-student-modal';

enum ModalMode {
  default,
  editProfile,
  editCover,
  delete
}

export default function StudentCards(props: { student: Student }) {
  const theme = useTheme();
  const [mode, setMode] = React.useState(ModalMode.default);
  const onClose = () => setMode(ModalMode.default);

  const subheaders = [];

  if (props.student.gender === 'male') {
    subheaders.push('A boy');
  } else if (props.student.gender === 'female') {
    subheaders.push('A girl');
  }

  if (props.student.age) {
    subheaders.push(`${props.student.age} years old`);
  }

  if (props.student.school) {
    subheaders.push(props.student.school);
  }

  return (
    <Card>
      {mode === ModalMode.editProfile && (
        <EditStudentModal
          student={props.student}
          onClose={onClose}
          onDelete={() => setMode(ModalMode.delete)}
        />
      )}
      {mode === ModalMode.delete && (
        <DeleteStudentModal student={props.student} onClose={onClose} />
      )}
      {mode === ModalMode.editCover && (
        <EditCoverModal student={props.student} onClose={onClose} />
      )}
      <CardMedia
        image={props.student.cover || defaultCoverUrl}
        style={{
          height: 196,
          position: 'relative'
        }}
      >
        <Button
          variant="outlined"
          size="small"
          color="inherit"
          onClick={() => setMode(ModalMode.editCover)}
          style={{
            margin: theme.spacing(2),
            backgroundColor: theme.palette.grey[300]
          }}
        >
          Update Cover Photo
        </Button>
      </CardMedia>
      <CardHeader
        avatar={<Avatar src={props.student.avatar || defaultAvatarUrl} />}
        title={props.student.name}
        titleTypographyProps={{
          noWrap: true,
          variant: 'h6'
        }}
        subheader={subheaders.join(', ')}
        action={
          <IconButton onClick={() => setMode(ModalMode.editProfile)}>
            <MoreVert />
          </IconButton>
        }
      />
    </Card>
  );
}
