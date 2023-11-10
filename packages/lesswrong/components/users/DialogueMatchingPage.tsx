import React, { useEffect, useRef, useState } from 'react';
import { Components, registerComponent } from '../../lib/vulcan-lib';
import { useTracking } from "../../lib/analyticsEvents";
import { gql, useQuery, useMutation } from "@apollo/client";
import { useUpdateCurrentUser } from "../hooks/useUpdateCurrentUser";
import { useCurrentUser } from '../common/withUser';
import { randomId } from '../../lib/random';
import { commentBodyStyles } from '../../themes/stylePiping';
import { useCreate } from '../../lib/crud/withCreate';
import { useNavigation } from '../../lib/routeUtil';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { useSingle } from '../../lib/crud/withSingle';
import { useMulti } from "../../lib/crud/withMulti";
import ReactConfetti from 'react-confetti';
import { Link } from '../../lib/reactRouterWrapper';
import classNames from 'classnames';
import { isMobile } from '../../lib/utils/isMobile'
import {postGetPageUrl} from '../../lib/collections/posts/helpers';
import { isProduction } from '../../lib/executionEnvironment';

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';

export type UpvotedUser = {
  _id: string;
  username: string;
  displayName: string;
  total_power: number;
  power_values: string;
  vote_counts: number;
  total_agreement: number;
  agreement_values: string;
};

export type CommentCountTag = {
  name: string;
  comment_count: number;
};

export type TopCommentedTagUser = {
  _id: string;
  username: string;
  displayName: string;
  total_power: number;
  tag_comment_counts: Array<{
    name: string;
    post_comment_count: number;
  }>
};

export type UserDialogueUsefulData = {
  dialogueUsers: UsersOptedInToDialogueFacilitation[],
  topUsers: UpvotedUser[],
}

export type TagWithCommentCount = {
  tag: DbTag,
  commentCount: number
}

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    padding: 20,
    ...commentBodyStyles(theme),
  },
  matchContainer: {
    maxWidth: 1300,
    padding: 20,
    backgroundColor: theme.palette.grey[100],
    borderRadius: 5,
  },
  matchContainerGridV1: {
    display: 'grid',    //        checkbox         name         message                match                           upvotes                  agreement           tags    posts read   
    gridTemplateColumns: `minmax(min-content, 60px) 100px minmax(min-content, 80px) minmax(min-content, 300px) minmax(min-content, 45px) minmax(min-content, 80px)  200px     550px`,
    gridRowGap: '5px',
    columnGap: '10px',
    alignItems: 'center'
  },
  matchContainerGridV2: {
    display: 'grid',    //        checkbox         name         message                match                    bio    tags    posts read  
    gridTemplateColumns: `minmax(min-content, 60px) 100px minmax(min-content, 80px) minmax(min-content, 300px) 200px  200px     550px `,
    gridRowGap: '5px',
    columnGap: '10px',
    alignItems: 'center'
  },
  header: {
    height: 'auto',
    margin: 0,
    marginBottom: 10,
    whiteSpace: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    height: 'auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  messageButton: {
    height: 'auto', // ???
    maxHeight: `17px`,
    fontFamily: theme.palette.fonts.sansSerifStack,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.link.unmarked,
    whiteSpace: 'nowrap'
  },
  newDialogueButton: {
    height: 'auto', // ???
    maxHeight: `17px`,
    fontFamily: theme.palette.fonts.sansSerifStack,
    backgroundColor: theme.palette.primary.light,
    color: 'white',
    whiteSpace: 'nowrap'
  },
  link: {
    color: theme.palette.primary.main,
    cursor: 'pointer',
    '&:hover': {
      color: theme.palette.primary.light,
    }
  },
  rootFlex: {
    display: 'flex',
    alignItems: 'stretch'
  },
  gradientBigTextContainer: {
    position: 'relative',
    maxHeight: '70px', 
    overflow: 'auto',
    color: 'grey', 
    fontSize: '14px',
    lineHeight: '1.15em',
    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
    '&.scrolled-to-bottom': {
      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)',
    },
    '&.scrolled-to-top': {
      WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
    }
  },
  privacyNote: {
    color: 'grey',
    fontSize: '1rem',
  },
  checkbox: {
    height: '10px', 
    color: 'default',
    '&$checked': {
      color: 'default',
    },
  },
  checked: {
    height: '10px', 
  },
  checkboxCheckedMatched: {
    height: '10px', 
    color: 'green',
    '&$checked': {
      color: 'green',
    },
  },
  checkboxCheckedNotMatched: {
    height: '10px', 
    color: '#ADD8E6',
    '&$checked': {
      color: '#00000038',
    },
  },
  centeredText: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  container: {
    maxWidth: '1100px',
  },

  // mobile warning stuff
  mobileWarning: {
    backgroundColor: 'yellow',
    padding: '10px',
    marginBottom: '20px',
    maxWidth: '40vw',
  },
  
  // opt-in stuff
  optInContainer: {
    height: '20px',
    display: 'flex',
    alignItems: 'top',
  },
  optInLabel: {
    paddingLeft: '8px',
  },
  optInCheckbox: {
    height: '10px',
    width: '30px',
    color: "#9a9a9a",
  },
});


const welcomeMessage = () => { // (formDataUser1: DbDialogueMatchPreference, formDataUser2: DbDialogueMatchPreference) => {
  let formatMessage
  let topicMessage 
  let nextAction

  const dummyData1 = {
    userId: "Jacob",
    topics: ["AI Alignment", "Rationality", "EA", "inner alignment"],
    topicNotes: "I'm interested in chatting about AI Alignment, Rationality and EA",
    formatSync: "Yes",
    formatAsync: "Meh",
    formatOther: "",
    formatNotes: "",
  }
  const dummyData2 = {
    userId: "Wentworth",
    topics: ["Animals", "EA", "inner alignment"],
    topicNotes: "I'm interested in these things but open to other things",
    formatSync: "No",
    formatAsync: "Yes",
    formatOther: "",
    formatNotes: ""
  }

  const isYesOrMeh = (value: string) => ["Yes", "Meh"].includes(value);

  const formatPreferenceMatch = 
    (isYesOrMeh(dummyData1.formatSync) && isYesOrMeh(dummyData2.formatSync)) ||
    (isYesOrMeh(dummyData1.formatAsync) && isYesOrMeh(dummyData2.formatAsync));

  const hasFormatNotes = (dummyData1.formatNotes !== "" || dummyData2.formatNotes !== "");

  formatMessage = `Format preferences: 
    * ${dummyData1.userId} is "${dummyData1.formatSync}" on sync and "${dummyData1.formatAsync}" on async. ${dummyData1.formatNotes}
    * ${dummyData2.userId} is "${dummyData2.formatSync}" on sync and "${dummyData2.formatAsync}" on async. ${dummyData2.formatNotes}
  `

  const topicsInCommon = dummyData1.topics.filter(topic => dummyData2.topics.includes(topic));
  const topicMatch = topicsInCommon.length > 0 || dummyData1.topicNotes !== "" || dummyData2.topicNotes !== "";

  if (!topicMatch) {
    topicMessage = `It seems you guys didn't have any preferred topics in common.
      * ${dummyData1.userId} topics: ${dummyData1.topics}
      * ${dummyData2.userId} topics: ${dummyData2.topics}
      That's okay! We still created this dialogue for you in case you wanted to come up with some more together. Though if you can't find anything that's alright, feel free to call it a good try and move on :)
    `
  } else {
    topicMessage = `
      You were both interested in discussing: ${topicsInCommon.join(", ")}.\n
    `
  }

  // default
  nextAction = `Our auto-checker couldn't tell if you were compatible or not. Feel free to chat to figure it out. And if it doesn't work it's totally okay to just call this a "good try" and then move on :)`

  if (!topicMatch && !formatPreferenceMatch) {
    nextAction = `
      It seems you didn't really overlap on topics or format. That's okay! It's fine to call this a "nice try" and just move on :) 
      (We still create this chat for you in case you wanted to discuss a bit more)
    `
  } 
  if (!topicMatch && formatPreferenceMatch) {
    nextAction = `
      It seems you didn't find a topic, but do overlap on format. Feel free to come up with some more topic ideas! If you can't find any, that's okay! It's fine to call this a "nice try" and just move on :) 
    `
  } 
  if (topicsInCommon && formatPreferenceMatch) {
    nextAction = `
      It seems you've got overlap on both topic and format! :) 
    `
  }
  if (topicsInCommon && !formatPreferenceMatch) {
    nextAction = `
      It seems you've got topics in common, but have different preferences on format. So a dialogue might not be the right solution here. That's okay! We still made this chat if you wanna hash it out more :) 
    `
  }

  const message = `
    Hey ${dummyData1.userId} and ${dummyData2.userId}: you matched on dialogues!`
    + topicMessage 
    + formatMessage
    + nextAction
  
  return message
}

async function pingSlackWebhook(webhookURL: string, data: any) {
  // ping the slack webhook to inform team of match. YOLO:ing and putting this on the client. Seems fine: but it's the second time this happens, and if we're doing it a third time, I'll properly move it all to the server 
  try {
    const response = await fetch(webhookURL, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response
  } catch (error) {
    //eslint-disable-next-line no-console
    console.error('There was a problem with the fetch operation: ', error);
  }
}

const useScrollGradient = (ref: React.RefObject<HTMLDivElement>) => {
  const [isScrolledToTop, setIsScrolledToTop] = useState(true);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  useEffect(() => {
    const element = ref.current;
    const handleScroll = () => {
      if (element) {
        const atTop = element.scrollTop <= (element.scrollHeight * 0.10);
        const atBottom = (element.scrollHeight - element.scrollTop) <= (element.clientHeight * 1.10);
        setIsScrolledToTop(atTop);
        setIsScrolledToBottom(atBottom);
      }
    };

    element?.addEventListener('scroll', handleScroll);
    return () => element?.removeEventListener('scroll', handleScroll);
  }, [ref]);

  return { isScrolledToTop, isScrolledToBottom };
};

const UserBio = ({ classes, userId }: { classes: ClassesType, userId: string }) => {
  const { document: userData, loading } = useSingle({
    documentId: userId,
    collectionName: "Users",
    fragmentName: "UsersProfile"
  });

  const bioContainerRef = useRef<HTMLDivElement | null>(null);
  const { isScrolledToTop, isScrolledToBottom } = useScrollGradient(bioContainerRef);

  return (
    <div 
      className={classNames(classes.gradientBigTextContainer, {
        'scrolled-to-top': isScrolledToTop,
        'scrolled-to-bottom': isScrolledToBottom
      })} 
      ref={bioContainerRef}
    >
      {userData?.biography?.plaintextDescription }
    </div>
  )
};



const UserPostsYouveRead = ({ classes, targetUserId, limit = 20}: { classes: ClassesType, targetUserId: string, limit?: number }) => {
  const currentUser = useCurrentUser();
  const { Loading, PostsTooltip, LWDialog } = Components;


  const { loading, error, data } = useQuery(gql`
    query UsersReadPostsOfTargetUser($userId: String!, $targetUserId: String!, $limit: Int) {
      UsersReadPostsOfTargetUser(userId: $userId, targetUserId: $targetUserId, limit: $limit) {
        _id
        title
      }
    }
  `, {
    variables: { userId: currentUser?._id, targetUserId: targetUserId, limit : limit },
  });

  const readPosts:DbPost[] = data?.UsersReadPostsOfTargetUser

  const readPostsContainerRef = useRef<HTMLDivElement | null>(null);
  const { isScrolledToTop, isScrolledToBottom } = useScrollGradient(readPostsContainerRef);

  if (loading) return < Loading/>
  if (error) return <p>Error: {error.message} </p>;

  return (
    <div 
      className={classNames(classes.gradientBigTextContainer, {
        'scrolled-to-top': isScrolledToTop,
        'scrolled-to-bottom': isScrolledToBottom
      })} 
      ref={readPostsContainerRef}
    >
      {readPosts.length > 0 ? (
        readPosts.map((post, index) => (
          <PostsTooltip key={index} postId={post._id}>
            <Link key={index} to={postGetPageUrl(post)}>• {post.title} </Link>
            <br/>
          </PostsTooltip>
        ))
      ) : (
        <p>(no posts read...)</p>
      )}
    </div>
  );
};

const UserTopTags = ({ classes, targetUserId }: { classes: ClassesType, targetUserId: string }) => {
  const { Loading } = Components;

  const { loading, error, data } = useQuery(gql`
    query UserTopTags($userId: String!) {
      UserTopTags(userId: $userId) {
        tag {
          name
          _id
        }
        commentCount
      }
    }
  `, {
    variables: { userId: targetUserId },
  });

  const topTags:[TagWithCommentCount] = data?.UserTopTags;

  const tagContainerRef = useRef<HTMLDivElement | null>(null);
  const { isScrolledToTop, isScrolledToBottom } = useScrollGradient(tagContainerRef);

  if (loading) return <Loading/>
  if (error) return <p>Error: {error.message} </p>;

  return (
    <div 
      className={classNames(classes.gradientBigTextContainer, {
        'scrolled-to-top': isScrolledToTop,
        'scrolled-to-bottom': isScrolledToBottom
      })}> 
      {topTags.length > 0 ? (
        topTags.map((tag, index) => (
          <div key={index}>
            • {tag.tag.name}
            <br/>
          </div>
        ))
      ) : (
        <p>(no comments...)</p>
      )}
    </div>
  );
};

const Headers = ({ titles, className }: { titles: string[], className: string }) => {
  return (
    <>
      {titles.map((title, index) => (
        <h5 key={index} className={className}> {title} </h5>
      ))}
    </>
  );
};

const Checkpoint: React.FC<{ label: string; status: 'done' | 'current' | 'not_started' }> = ({ label, status }) => {
  let backgroundColor;
  let borderColor;
  let size;
  let labelColor;

  switch (status) {
    case 'done':
      backgroundColor = 'green';
      borderColor = 'green';
      size = '15px';
      labelColor = 'green';
      break;
    case 'current':
      backgroundColor = 'white';
      borderColor = 'green';
      size = '15px';
      labelColor = 'black';
      break;
    case 'not_started':
    default:
      backgroundColor = '#d3d3d3'; // Lighter shade of gray
      borderColor = '#d3d3d3'; // Lighter shade of gray
      size = '10px';
      labelColor = 'gray';
      break;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
        <div style={{ height: '20px', width: '2px', backgroundColor: '#d3d3d3' }}></div> {/* Lighter shade of gray */}
        <div style={{ height: size, width: size, borderRadius: '50%', backgroundColor: backgroundColor, border: `2px solid ${borderColor}`, margin: 'auto' }}></div>
        <div style={{ height: '20px', width: '2px', backgroundColor: '#d3d3d3' }}></div> {/* Lighter shade of gray */}
      </div>
      <div style={{ marginLeft: '10px', color: labelColor }}>{label}</div>
    </div>
  );
};

const DialogueProgress: React.FC<{ checkpoints: { label: string; status: 'done' | 'current' | 'not_started' }[] }> = ({ checkpoints }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
    {checkpoints.map((checkpoint, index) => (
      <Checkpoint key={index} label={checkpoint.label} status={checkpoint.status} />
    ))}
  </div>
);


type NextStepsDialogProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  targetUserId: string;
  targetUserDisplayName: string;
  dialogueCheckId: string;
};

const NextStepsDialog: React.FC<NextStepsDialogProps> = ({ open, onClose, userId, targetUserId, targetUserDisplayName, dialogueCheckId }) => {

  const { WrappedSmartForm } = Components;


  const [topicNotes, setTopicNotes] = useState("");
  const [formatSync, setFormatSync] = useState(false);
  const [formatAsync, setFormatAsync] = useState(false);
  const [formatOther, setFormatOther] = useState(false);
  const [formatNotes, setFormatNotes] = useState("");

  // const [sendMatchMessage] = useMutation(gql`
  //   mutation messageUserDialogueMatch($userId: String!, $targetUserId: String!, $topicNotes: String!, $formatSync: Boolean!, $formatAsync: Boolean!, $formatOther: Boolean!, $formatNotes: String!) {
  //     messageUserDialogueMatch(userId: $userId, targetUserId: $targetUserId, topicNotes: $topicNotes, formatSync: $formatSync, formatAsync: $formatAsync, formatOther: $formatOther, formatNotes: $formatNotes) {
  //       conversationId
  //     }
  //   }
  // `)

  const [createDialogueMatchPreference] = useMutation(gql`
    mutation createDialogueMatchPreference($dialogueCheckId: String!, $topicNotes: String!, $syncPreference: String!, $asyncPreference: String!, $formatNotes: String!) {
      createDialogueMatchPreference(dialogueCheckId: $dialogueCheckId, topicNotes: $topicNotes, syncPreference: $syncPreference, asyncPreference: $asyncPreference, formatNotes: $formatNotes) {
        data {
          _id
          dialogueCheckId
          topicNotes
          syncPreference
          asyncPreference
          formatNotes
        }
      }
    }
  `)

  const { history } = useNavigation();

  const onSubmit = async () => {
    const response = await createDialogueMatchPreference({
      variables: {
        dialogueCheckId: dialogueCheckId,
        topicNotes: topicNotes,
        syncPreference: formatSync,
        asyncPreference: formatAsync,
        formatNotes: formatNotes,
      }
    })

    console.log(response)

    // history.push(`/inbox/${response.data.messageUserDialogueMatch.conversationId}`);
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <div style={{ display: 'flex' }}>
        <DialogContent>
          <DialogueProgress
            checkpoints={[
              { label: 'Find partner', status: 'done' },
              { label: 'Find topic & format', status: 'current' },
              { label: 'Write dialogue', status: 'not_started' },
              { label: 'Edit', status: 'not_started' },
              { label: 'Publish', status: 'not_started' },
            ]}
          />
        </DialogContent>
        <div>
          <DialogTitle  style={{ marginLeft: '20px' }}>Alright, you matched with {targetUserDisplayName}!</DialogTitle>
          <DialogContent >
          
            <div style={{ marginLeft: '20px' }}>
              <p>Fill in this quick form to get started. Once you submit you'll be taken to a chat where you can see {targetUserDisplayName}'s answers.</p>
              <h3>Topic</h3>
              <p>Here are some things we auto-generated that you might be interested in chatting about.</p>
              <div style={{backgroundColor: '#f5f5f5', maxHeight: '200px', overflowY: 'scroll', padding: '10px'}}>
                <p>• Prosaic Alignment is currently more important to work on than Agent Foundations work</p>
                <p>• EAs and rationalists should strongly consider having lots more children than they currently are</p>
                <p>• It was a mistake to increase salaries in the broader EA/Rationality/AI-Alignment ecosystem between 2019 and 2022</p>
              </div>
              <p>What are you interested in chatting about?</p>
              <TextField
                multiline
                rows={2}
                variant="outlined"
                label={`Feel free to leave any notes on topics for ${targetUserDisplayName}`}
                fullWidth
                value={topicNotes}
                onChange={event => setTopicNotes(event.target.value)}
              />
              <br />
              <br />
              <h3>Format</h3>
              <p>Tick any you'd be open to.</p>
              <FormControlLabel
                control={<Checkbox checked={formatSync} onChange={event => setFormatSync(event.target.checked)} />}
                label="Find a synchronous 2h block to sit down and dialogue"
              />
              <FormControlLabel
                control={<Checkbox checked={formatAsync} onChange={event => setFormatAsync(event.target.checked)} />}
                label="Have an asynchronous dialogue where you reply where convenient (suggested amount of effort: send at least two longer replies each before considering publishing)"
              />
              <FormControlLabel
                control={<Checkbox checked={formatOther} onChange={event => setFormatOther(event.target.checked)} />}
                label="Other"
              />
              <TextField
                multiline
                rows={2}
                variant="outlined"
                label="Notes on your choice..."
                fullWidth
                value={formatNotes}
                onChange={event => setFormatNotes(event.target.value)}
              />
            </div>
          </DialogContent>
        </div>
      </div>
      <DialogActions>
        <Button onClick={onClose} color="default">
          Close
        </Button>
        <Button onClick={onSubmit} color="primary">
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DialogueCheckBox: React.FC<{
  targetUserId : string;
  targetUserDisplayName : string;
  checkId?: string;
  isChecked: boolean, 
  isMatched: boolean;
  classes: ClassesType;
}> = ({ targetUserId, targetUserDisplayName, checkId, isChecked, isMatched, classes}) => {
  const currentUser = useCurrentUser();
  const { captureEvent } = useTracking(); //it is virtuous to add analytics tracking to new components

  const [upsertDialogueCheck] = useMutation(gql`
    mutation upsertUserDialogueCheck($targetUserId: String!, $checked: Boolean!) {
      upsertUserDialogueCheck(targetUserId: $targetUserId, checked: $checked) {
          _id
          __typename
          userId
          targetUserId
          checked
          checkedAt
          match
        }
      }
    `)

  const [openNextSteps, setOpenNextSteps] = useState(false);
  
  async function handleNewMatchAnonymisedAnalytics() {
    captureEvent("newDialogueReciprocityMatch", {}) // we only capture match metadata and don't pass anything else

    // ping the slack webhook to inform team of match. YOLO:ing and putting this on the client. Seems fine: but it's the second time this happens, and if we're doing it a third time, I'll properly move it all to the server 
    const webhookURL = isProduction ? "https://hooks.slack.com/triggers/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" : "https://hooks.slack.com/triggers/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"  //
    const data = {} // Not sending any data for now 
    void pingSlackWebhook(webhookURL, data)
    
  }

  const [showConfetti, setShowConfetti] = useState(false);


  async function updateDatabase(event: React.ChangeEvent<HTMLInputElement>, targetUserId: string, checkId?: string) {
    if (!currentUser) return;

    const response = await upsertDialogueCheck({
      variables: {
        targetUserId: targetUserId, 
        checked: event.target.checked
      },
      update(cache, { data }) {
        if (!checkId) {
          cache.modify({
            fields: {
              dialogueChecks(existingChecksRef) {
                const newCheckRef = cache.writeFragment({
                  data: data.upsertUserDialogueCheck,
                  fragment: gql`
                    fragment DialogueCheckInfo on DialogueCheck {
                      _id
                      userId
                      targetUserId
                      checked
                      checkedAt
                      match
                    }
                  `
                });
                return {
                  ...existingChecksRef,
                  results: [...existingChecksRef.results, newCheckRef]
                }
              }
            }
          });
        }
      },
      optimisticResponse: {
        upsertUserDialogueCheck: {
          _id: checkId || randomId(),
          __typename: 'DialogueCheck',
          userId: currentUser._id,
          targetUserId: targetUserId,
          checked: event.target.checked,
          checkedAt: new Date(),
          match: false 
        }
      }
    })
    
    if (response.data.upsertUserDialogueCheck.match) {
      void handleNewMatchAnonymisedAnalytics()
      setShowConfetti(true);
      setOpenNextSteps(true);
    }
  }

  return (
    <>
      {showConfetti && <ReactConfetti recycle={false} colors={["#7faf83", "#00000038" ]} onConfettiComplete={() => setShowConfetti(false)} />}
      {openNextSteps && 
        <NextStepsDialog 
          open={openNextSteps} 
          onClose={() => setOpenNextSteps(false)} 
          userId={currentUser?._id}
          targetUserId={targetUserId}
          targetUserDisplayName={targetUserDisplayName} 
          dialogueCheckId={checkId}
        />
      }
      <FormControlLabel
        control={ 
          <Checkbox 
            classes={{
              root: classNames({
                [classes.checkbox]: !isChecked,
                [classes.checkboxCheckedMatched]: isChecked && isMatched,
                [classes.checkboxCheckedNotMatched]: isChecked && !isMatched
              }),
              checked: classes.checked
            }}
            onChange={event => updateDatabase(event, targetUserId, checkId) } 
            checked={isChecked}
          />
        }
        label=""
      />
    </>
  );
};

const isMatched = (userDialogueChecks: DialogueCheckInfo[], targetUserId: string): boolean => {
  return userDialogueChecks.some(check => check.targetUserId === targetUserId && check.match);
};

const isChecked = (userDialogueChecks: DialogueCheckInfo[], targetUserId: string): boolean => {
  return userDialogueChecks?.find(check => check.targetUserId === targetUserId)?.checked || false;
};

type MatchDialogueButtonProps = {
  isMatched: boolean;
  targetUserId: string;
  targetUserDisplayName: string;
  currentUser: UsersCurrent;
  loadingNewDialogue: boolean;
  createDialogue: (title: string, participants: string[]) => void;
  classes: ClassesType;
};

const MatchDialogueButton: React.FC<MatchDialogueButtonProps> = ({
  isMatched,
  targetUserId,
  targetUserDisplayName,
  currentUser,
  loadingNewDialogue,
  createDialogue,
  classes,
}) => {
  if (!isMatched) return <div></div>; // need this instead of null to keep the table columns aligned

  return (
    <div>
      <button
        className={classes.newDialogueButton}
        onClick={(e) =>
          createDialogue(
            `${currentUser?.displayName}/${targetUserDisplayName}`,
            [targetUserId]
          )
        }
      >
        {loadingNewDialogue ? <a data-cy="message">Creating New Dialogue...</a> : <a data-cy="message">Start Dialogue</a>}
      </button>
    </div>
  );
};

const MessageButton: React.FC<{
  targetUserId: string;
  currentUser: UsersCurrent; 
  classes: ClassesType;
}> = ({ targetUserId, currentUser, classes }) => {
  const { NewConversationButton } = Components;
  
  return (
    <button className={classes.messageButton}>
      <NewConversationButton user={{_id: targetUserId}} currentUser={currentUser}>
        <a data-cy="message">Message</a>
      </NewConversationButton>
    </button>
  );
};


interface CommonDialogueUserRowProps {
  checkId: string | undefined;
  userIsChecked: boolean;
  userIsMatched: boolean;
  classes: ClassesType;
  currentUser: UsersCurrent;
  loadingNewDialogue: boolean;
  createDialogue: ((title: string, participants: string[]) => void);
  showBio: boolean | undefined;
  showFrequentCommentedTopics: boolean | undefined;
  showPostsYouveRead: boolean | undefined;
}

type DialogueUserRowProps<V extends boolean> = V extends true ? (CommonDialogueUserRowProps & {
  targetUser: UpvotedUser;
  showKarma: boolean;
  showAgreement: boolean;
}) : (CommonDialogueUserRowProps & {
  targetUser: Omit<UsersOptedInToDialogueFacilitation, 'karma'>;
  showKarma: false;
  showAgreement: false;
});

const DialogueUserRow = <V extends boolean>(props: DialogueUserRowProps<V>): JSX.Element => {
  const { targetUser, checkId, userIsChecked, userIsMatched, classes, currentUser, loadingNewDialogue, createDialogue, showKarma, showAgreement, showBio, showFrequentCommentedTopics, showPostsYouveRead } = props;
  const { UsersName } = Components;

  return <React.Fragment key={`${targetUser._id}_other`}>
    <DialogueCheckBox
      targetUserId={targetUser._id}
      targetUserDisplayName={targetUser.displayName}
      checkId={checkId}
      isChecked={userIsChecked}
      isMatched={userIsMatched}
      classes={classes} />
    <UsersName
      className={classes.displayName}
      documentId={targetUser._id}
      simple={false} />
    <MessageButton
      targetUserId={targetUser._id}
      currentUser={currentUser}
      classes={classes} />
    <MatchDialogueButton
      isMatched={userIsMatched}
      targetUserId={targetUser._id}
      targetUserDisplayName={targetUser.displayName}
      currentUser={currentUser}
      loadingNewDialogue={loadingNewDialogue}
      createDialogue={createDialogue}
      classes={classes} />
    {showKarma && <div className={classes.centeredText}> {targetUser.total_power} </div>}
    {showAgreement && <div className={classes.centeredText}> {targetUser.total_agreement} </div>}
    {showBio && <UserBio
      key={targetUser._id}
      classes={classes}
      userId={targetUser._id} />}
    {showFrequentCommentedTopics && <UserTopTags
      classes={classes}
      targetUserId={targetUser._id} />}
    {showPostsYouveRead && <UserPostsYouveRead
      classes={classes}
      targetUserId={targetUser._id}
      limit={8} />}
  </React.Fragment>;
}

type RowUser = UsersOptedInToDialogueFacilitation & {
  [k in keyof Omit<UpvotedUser, '_id' | 'username' | 'displayName'>]?: never;
};

type CommonUserTableProps = {
  classes: ClassesType;
  gridClassName: string,
  currentUser: UsersCurrent;
  userDialogueChecks: DialogueCheckInfo[];
  loadingNewDialogue: boolean;
  createDialogue: (title: string, participants: string[]) => void;
  showBio: boolean;
  showPostsYouveRead: boolean;
  showFrequentCommentedTopics: boolean;
}

type UserTableProps<V extends boolean> = V extends false ? (CommonUserTableProps & {
  users: RowUser[];
  showKarma: false;
  showAgreement: false;
  isUpvotedUser: false;
}) : (CommonUserTableProps & {
  users: UpvotedUser[];
  showKarma: boolean;
  showAgreement: boolean;
  isUpvotedUser: true;
});

const getUserCheckInfo = (targetUser: RowUser | UpvotedUser, userDialogueChecks: DialogueCheckInfo[]) => {
  const checkId = userDialogueChecks?.find(check => check.targetUserId === targetUser._id)?._id;
  const userIsChecked = isChecked(userDialogueChecks, targetUser._id);
  const userIsMatched = isMatched(userDialogueChecks, targetUser._id);
  return {
    checkId,
    userIsChecked,
    userIsMatched
  };
}

const getRowProps = <V extends boolean>(tableProps: UserTableProps<V>): DialogueUserRowProps<V>[] => {
  return tableProps.users.map(targetUser => {
    const checkInfo = getUserCheckInfo(targetUser, tableProps.userDialogueChecks);
    const { users, userDialogueChecks, gridClassName, ...remainingRowProps } = tableProps;
  
    const rowProps = {
      targetUser,
      ...checkInfo,
      ...remainingRowProps,
    };

    return rowProps;
  }) as DialogueUserRowProps<V>[];
};

const UserTable = <V extends boolean>(props: UserTableProps<V>) => {
  const {
    users,
    classes,
    gridClassName,
    userDialogueChecks,
    ...rest
  } = props;

  const headers = [
    "Dialogue",
    "Name",
    "Message",
    "Match",
    ...(rest.showKarma ? ["Karma"] : []),
    ...(rest.showAgreement ? ["Agreement"] : []),
    ...(rest.showBio ? ["Bio"] : []),
    ...(rest.showFrequentCommentedTopics ? ["Frequent commented topics"] : []),
    ...(rest.showPostsYouveRead ? ["Posts you've read"] : []),
  ];

  let rows;
  if (props.isUpvotedUser) {
    const allRowProps = getRowProps<true>(props);
    rows = allRowProps.map((props) => <DialogueUserRow key={props.targetUser._id} {...props} />);
  } else {
    props.showKarma
    const allRowProps = getRowProps<false>(props);
    rows = allRowProps.map((props) => <DialogueUserRow key={props.targetUser._id} {...props} />);
  }

  return (
    <div className={gridClassName}>
      <Headers titles={headers} className={classes.header} />
      {rows}
    </div>
  );
};

export const DialogueMatchingPage = ({classes}: {
  classes: ClassesType,
}) => {
  console.log(welcomeMessage())

  
  const { captureEvent } = useTracking(); //it is virtuous to add analytics tracking to new components

  const updateCurrentUser = useUpdateCurrentUser()
  const currentUser = useCurrentUser();
  const [optIn, setOptIn] = React.useState(currentUser?.revealChecksToAdmins); // for rendering the checkbox

  const { Loading, LoadMore, IntercomWrapper } = Components;

  const {create: createPost, loading: loadingNewDialogue, error: newDialogueError} = useCreate({ collectionName: "Posts", fragmentName: "PostsEdit" });
  const { history } = useNavigation();

  const { loading, error, data } = useQuery(gql`
    query getDialogueUsers {
      GetUserDialogueUsefulData {
        dialogueUsers {
          _id
          displayName
        }
        topUsers {
          _id
          displayName
          total_power
          total_agreement
        }
       }
    }
  `);

  const userDialogueUsefulData: UserDialogueUsefulData = data?.GetUserDialogueUsefulData;

  const { data: matchedUsersResult } = useQuery(gql`
    query GetDialogueMatchedUsers {
      GetDialogueMatchedUsers {
        _id
        displayName
      }
    }
  `);

  const matchedUsers: UsersOptedInToDialogueFacilitation[] | undefined = matchedUsersResult?.GetDialogueMatchedUsers;

  console.log({ matchedUsers });

  const {loading: userLoading, results: userDialogueChecks} = useMulti({
    terms: {
      view: "userDialogueChecks",
      userId: currentUser?._id,
      limit: 1000,
    },
    fragmentName: "DialogueCheckInfo",
    collectionName: "DialogueChecks",
  });

  const {loading: userOptedInLoading, results: usersOptedInToDialogueFacilitation, loadMoreProps} = useMulti({
    terms: { 
      view: 'usersWithOptedInToDialogueFacilitation',
      limit: 10, 
        },
    fragmentName: 'UsersOptedInToDialogueFacilitation',
    collectionName: 'Users'  
  });

  if (loading) {
    return <Loading />;
  } else if (!usersOptedInToDialogueFacilitation) {
    return <p>Error...</p>;
  }

  const targetUserIds = userDialogueChecks?.map(check => check.targetUserId) ?? [];

  async function createDialogue(title: string, participants: string[]) {
    const createResult = await createPost({
      data: {
        title,
        draft: true,
        collabEditorDialogue: true,
        coauthorStatuses: participants.map(userId => ({userId, confirmed: true, requested: false})),
        shareWithUsers: participants,
        sharingSettings: {
          anyoneWithLinkCan: "none",
          explicitlySharedUsersCan: "edit",
        },
        contents: {
          originalContents: {
            type: "ckEditorMarkup",
            data: ""
          }
        } as AnyBecauseHard
      },
    });
    if (createResult?.data?.createPost?.data) {
      const post = createResult?.data?.createPost?.data;
      if (post) {
        const postId = post._id;
        const postEditUrl = `/editPost?postId=${postId}`;
        history.push(postEditUrl);
      }
    }
  }

  if (!currentUser) return <p>You have to be logged in to view this page</p>
  if (loading) return <Loading />
  if (error || !userDialogueChecks || userDialogueChecks.length > 1000) return <p>Error </p>; // if the user has clicked that much stuff things might break...... 
  if (userDialogueChecks?.length > 1000) {
    throw new Error(`Warning: userDialogueChecks.length > 1000, seems user has checked more than a thousand boxes? how is that even possible? let a dev know and we'll fix it...`);
  }

  const handleOptInToRevealDialogueChecks = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setOptIn(event.target.checked);
    void updateCurrentUser({revealChecksToAdmins: event.target.checked})
    captureEvent("optInToRevealDialogueChecks", {optIn: event.target.checked})
    
    if (event.target.checked) {
       // ping the slack webhook to inform team of opt-in. YOLO:ing and putting this on the client. Seems fine. 
      const webhookURL = "https://hooks.slack.com/triggers/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" 
      const userDetailString = currentUser?.displayName + " / " + currentUser?.slug
      const data = { user: userDetailString };
      void pingSlackWebhook(webhookURL, data)
    }
  };

  const prompt = "Opt-in to LessWrong team viewing your checks, to help proactively suggest and facilitate dialogues" 

  return (
  <div className={classes.root}>
    <div className={classes.container}>
      {isMobile() && (
        <div className={classes.mobileWarning}>
          Dialogues matching doesn't render well on mobile right now. <br/> <br /> Please view on laptop or tablet!
        </div>
      )}

      <h1>Dialogue Matching</h1>
      <p>
        Check a user you'd be interested in having a dialogue with, if they were interested too. Users will 
        not see whether you have checked them unless they have also checked you. A check is not a commitment, just an indication of interest.
        You can message people even if you haven't matched. 
        (Also, there are no notifications on match, as we haven't built that yet. You'll have to keep checking the page :)
      </p>
      
      <div className={classes.optInContainer}>
        <FormControlLabel className={classes.optInLabel}
          control={
            <Checkbox
              checked={optIn}
              onChange={event => handleOptInToRevealDialogueChecks(event)}
              name="optIn"
              color="primary"
              className={classes.optInCheckbox}
            />
          }
          label={<span className={classes.prompt}> {prompt} </span>}
        />
    </div> 
    </div> 
    <p className={classes.privacyNote}>On privacy: LessWrong team does not look at user’s checks. We do track metadata, like “Two users just matched”, 
      to help us know whether the feature is getting used. If one user opts in to revealing their checks we can still not see their matches, unless 
      the other part of the match has also opted in.
    </p>
    <div className={classes.rootFlex}>
      <div className={classes.matchContainer}>
        <h3>Users you've matched with</h3>
        <UserTable
          users={matchedUsers ?? []}
          isUpvotedUser={false}
          classes={classes}
          gridClassName={classes.matchContainerGridV2}
          currentUser={currentUser}
          userDialogueChecks={userDialogueChecks}
          loadingNewDialogue={loadingNewDialogue}
          createDialogue={createDialogue}
          showBio={true}
          showKarma={false}
          showAgreement={false}
          showPostsYouveRead={true}
          showFrequentCommentedTopics={true}
        />
      </div>
    </div>
    <div className={classes.rootFlex}>
      <div className={classes.matchContainer}>
        <h3>Your top upvoted users (last 1.5 years)</h3>
        <UserTable
          users={userDialogueUsefulData.topUsers}
          isUpvotedUser={true}
          classes={classes}
          gridClassName={classes.matchContainerGridV1}
          currentUser={currentUser}
          userDialogueChecks={userDialogueChecks}
          loadingNewDialogue={loadingNewDialogue}
          createDialogue={createDialogue}
          showBio={false}
          showKarma={true}
          showAgreement={true}
          showPostsYouveRead={true}
          showFrequentCommentedTopics={true}
        />
      </div>
    </div>
    <br />
    <div className={classes.rootFlex}>
      <div className={classes.matchContainer}>
        <h3>Users who published dialogues</h3>
        <UserTable
          users={userDialogueUsefulData.dialogueUsers}
          isUpvotedUser={false}
          classes={classes}
          gridClassName={classes.matchContainerGridV2}
          currentUser={currentUser}
          userDialogueChecks={userDialogueChecks}
          loadingNewDialogue={loadingNewDialogue}
          createDialogue={createDialogue}
          showBio={true}
          showKarma={false}
          showAgreement={false}
          showPostsYouveRead={true}
          showFrequentCommentedTopics={true}
        />
      </div>
    </div>
    <br />
    <div className={classes.rootFlex}>
      <div className={classes.matchContainer}>
        <h3>Users who opted in to dialogue matchmaking on frontpage</h3>
        <UserTable
          users={usersOptedInToDialogueFacilitation}
          isUpvotedUser={false}
          classes={classes}
          gridClassName={classes.matchContainerGridV2}
          currentUser={currentUser}
          userDialogueChecks={userDialogueChecks}
          loadingNewDialogue={loadingNewDialogue}
          createDialogue={createDialogue}
          showBio={true}
          showKarma={false}
          showAgreement={false}
          showPostsYouveRead={true}
          showFrequentCommentedTopics={true}
        />
        <LoadMore {...loadMoreProps} />
      </div>
    </div>
    <IntercomWrapper />
  </div>)
}

const DialogueMatchingPageComponent = registerComponent('DialogueMatchingPage', DialogueMatchingPage, {styles});

declare global {
  interface ComponentTypes {
    DialogueMatchingPage: typeof DialogueMatchingPageComponent
  }
}
