import React, { useState } from 'react';
import { Components, getFragment, registerComponent } from '../../lib/vulcan-lib';
import { commentBodyStyles } from '@/themes/stylePiping';
import classNames from 'classnames';
import { useUpdate } from '@/lib/crud/withUpdate';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';

const APPROVED_PADDING = 10;

const styles = (theme: ThemeType) => ({
  root: {
    width: '100%',
    ...commentBodyStyles(theme),
    pointerEvents: 'undefined',
    marginTop: 0,
    padding: 6,
    borderBottom: theme.palette.border.commentBorder,
    display: 'flex',
    alignItems: 'center',
    '&:last-child': {
      borderBottom: 'none',
    },
    '&:hover $bottomButton': {
      opacity: .5
    }
  },
  unapproved: {
    opacity: .5,
  },
  editButton: {
    cursor: 'pointer',
    fontSize: '1rem',
  },
  leftButtons: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: 6
  },
  leftButton: {
    opacity: 0,
    transition: 'opacity 0.1s',
    '&:hover': {
      opacity: .7
    },
    minHeight: "auto !important",
    minWidth: "auto !important",
    cursor: 'pointer',
    height: 26,
    padding: 4,
    paddingLeft: 4,
    width: 26,
  },
  hideIcon: {
    cursor: 'pointer',
    color: theme.palette.grey[500],
    height: 16,
    width: 16,
    marginRight: 8,
    opacity: 0,
    '&:hover': {
      opacity: 1
    }
  },
  arrowRightButton: {
    marginLeft: 8,
    cursor: 'pointer',
    color: theme.palette.grey[500],
    height: 18,
    width: 18,
    opacity: 0,
    '&:hover': {
      opacity: 1
    }
  },
  deleted: {
    opacity: .4,
  },
  bottomButtons: {
    marginTop: 8,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bottomButton: {
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: 4,
    fontSize: '1rem',
    opacity: .1,
    '&:hover': {
      backgroundColor: theme.palette.grey[100],
      opacity: 1
    }
  },
  formStyles: {
    '& .form-section-default > div': {
      display: "flex",
      flexWrap: "wrap",
    },
    '& .ContentStyles-commentBody': {
      fontSize: '1.1rem',
    },
    '& .form-component-EditorFormComponent': {
      marginBottom: 0,
      width: '100%',
    },
    '& .form-component-default, & .MuiTextField-textField': {
      marginBottom: 0,
      marginTop: 0,
      width: 150,
      marginRight: 20
    },
  },
  explanationContainer: {
    cursor: 'text',
    '& > *': {
      lineHeight: 1.6,
      height: '1.6rem',
      overflow: 'hidden',
      color: theme.palette.grey[600],
      '& strong': {
        color: theme.palette.grey[900],
        marginRight: 8
      }
    }
  },
  checkbox: {
    width: 30,
    height: 30,
    paddingRight: 28,
    paddingLeft: 22,
  },
  instancesOfJargonCount: {
    width: 30,
    textAlign: 'center', 
    whiteSpace: 'nowrap',
    color: theme.palette.grey[600],
  }
});

const submitStyles = (theme: ThemeType) => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: -6,
    justifyContent: 'end',
    height: 36,
  },
  submitButton: {
    color: theme.palette.secondary.main
  },
  cancelButton: {},
});

// Jargon submit button

const JargonSubmitButton = ({ submitForm, cancelCallback, classes }: FormButtonProps & { classes: ClassesType<typeof submitStyles> }) => {
  const { Loading } = Components;

  const [loading, setLoading] = useState(false);

  const wrappedSubmitForm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true);
    await submitForm(e);
    setLoading(false);
  }

  return <div className={classes.root}>
    {!loading && <Button onClick={cancelCallback} className={classes.cancelButton}>Cancel</Button>}
    {!loading && <Button onClick={wrappedSubmitForm} className={classes.submitButton}>Submit</Button>}
    {loading && <Loading />}
  </div>
};


// Jargon editor row

export const JargonEditorRow = ({classes, postId, jargonTerm, instancesOfJargonCount}: {
  classes: ClassesType<typeof styles>,
  postId: string,
  jargonTerm?: JargonTerms,
  instancesOfJargonCount?: number,
}) => {

  const [edit, setEdit] = useState(false);

  const {mutate: updateJargonTerm} = useUpdate({
    collectionName: "JargonTerms",
    fragmentName: 'JargonTerms',
  });

  const handleActiveChange = () => {
    if (!jargonTerm) {
      return;
    }

    void updateJargonTerm({
      selector: { _id: jargonTerm._id },
      data: {
        approved: !jargonTerm.approved
      },
      optimisticResponse: {
        ...jargonTerm,
        approved: !jargonTerm.approved,
      }
    })
  }

  const handleDelete = () => {
    if (!jargonTerm) {
      return;
    }

    void updateJargonTerm({
      selector: { _id: jargonTerm._id },
      data: {
        deleted: true
      },
      optimisticResponse: {
        ...jargonTerm,
        deleted: true,
      }
    })
  }
  const { JargonTooltip, WrappedSmartForm, ContentItemBody, LWTooltip } = Components;

  const jargonDefinition = jargonTerm?.contents?.originalContents?.data ?? '';

  if (!jargonTerm) {
    // TODO: implement validation for new terms; they should be present in the post, and not already exist as a term on the post.
    // That should probably be in a validation callback, but can do client-side validation as well.
    return <div className={classes.root}>
      <div className={classes.formStyles}>
        <WrappedSmartForm
          collectionName="JargonTerms"
          mutationFragment={getFragment('JargonTerms')}
          queryFragment={getFragment('JargonTerms')}
          formComponents={{ FormSubmit: Components.JargonSubmitButton }}
          prefilledProps={{ postId }}
        />
      </div>
    </div>;
  }

  return <div className={classes.root}>
      <div onClick={handleActiveChange}>
        <Checkbox checked={jargonTerm.approved} className={classes.checkbox} />
      </div>
      {edit ? <div className={classes.formStyles}>
          <WrappedSmartForm
            collectionName="JargonTerms"
            documentId={jargonTerm._id}
            mutationFragment={getFragment('JargonTerms')}
            queryFragment={getFragment('JargonTerms')}
            successCallback={() => setEdit(false)}
            cancelCallback={() => setEdit(false)}
            formComponents={{ FormSubmit: Components.JargonSubmitButton }}
            prefetchedDocument={jargonTerm}
          />
        </div>
      : <div className={classNames(classes.explanationContainer, !jargonTerm.approved && classes.unapproved)} onClick={() => setEdit(true)}>
          <JargonTooltip term={jargonTerm.term} definitionHTML={jargonDefinition} altTerms={jargonTerm.altTerms ?? []} humansAndOrAIEdited={jargonTerm.humansAndOrAIEdited} replacedSubstrings={[]} placement="bottom-end">
            <ContentItemBody dangerouslySetInnerHTML={{ __html: jargonDefinition }} />
          </JargonTooltip>
        </div>}
      <LWTooltip title={<div>{jargonTerm.term} is used {instancesOfJargonCount} times in this post</div>} placement="right">
        <div className={classNames(classes.instancesOfJargonCount, !jargonTerm.approved && classes.unapproved)}>
          {instancesOfJargonCount}
        </div>
      </LWTooltip>
      <LWTooltip title={<div><div>Remove from list</div><div><em>(You can unhide it later)</em></div></div>} placement="right">
        <span onClick={() => handleDelete()} className={classes.bottomButton}>
          x
        </span>
      </LWTooltip>  
  </div>
}

const JargonSubmitButtonComponent = registerComponent('JargonSubmitButton', JargonSubmitButton, {styles: submitStyles});
const JargonEditorRowComponent = registerComponent('JargonEditorRow', JargonEditorRow, {styles});

declare global {
  interface ComponentTypes {
    JargonSubmitButton: typeof JargonSubmitButtonComponent,
    JargonEditorRow: typeof JargonEditorRowComponent
  }
}
