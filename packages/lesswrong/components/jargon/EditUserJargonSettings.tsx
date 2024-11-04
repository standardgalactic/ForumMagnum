// TODO: Import component in components.ts
import React from 'react';
import { Components, registerComponent } from '../../lib/vulcan-lib';
import { useTracking } from "../../lib/analyticsEvents";
import { useUpdateCurrentUser } from '../hooks/useUpdateCurrentUser';
import { useCurrentUser } from '../common/withUser';
import Checkbox from '@material-ui/core/Checkbox';
import { JARGON_LLM_MODEL } from './GlossaryEditForm';

const styles = (theme: ThemeType) => ({
  root: {

  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  generationFlagCheckbox: {
    marginRight: 2,
    padding: 8,
  },
});

export const EditUserJargonSettings = ({classes}: {
  classes: ClassesType<typeof styles>,
}) => {
  const { captureEvent } = useTracking(); //it is virtuous to add analytics tracking to new components
  const currentUser = useCurrentUser();
  const updateCurrentUser = useUpdateCurrentUser();

  const { LWTooltip, MetaInfo } = Components;
  return <>
      <LWTooltip title={<div><div>Automatically generate jargon for all your drafts, by default</div>
      <em>(i.e. send your drafts to {JARGON_LLM_MODEL} every ~5 minutes)</em></div>}>
        <div className={classes.checkboxContainer}>
          <Checkbox
            className={classes.generationFlagCheckbox}
            checked={currentUser?.generateJargonForDrafts}
            onChange={(e) => updateCurrentUser({generateJargonForDrafts: e.target.checked})}
          />
          <MetaInfo>Autogen for all my drafts</MetaInfo>
        </div>
      </LWTooltip>
      <LWTooltip title="Automatically query jargon for all published posts">
        <div className={classes.checkboxContainer}>
          <Checkbox
            className={classes.generationFlagCheckbox}
            checked={currentUser?.generateJargonForPublishedPosts}
            onChange={(e) => updateCurrentUser({generateJargonForPublishedPosts: e.target.checked})}
          />
          <MetaInfo>Autogen for all my published posts</MetaInfo>
        </div>
      </LWTooltip>
  </>;
}

const EditUserJargonSettingsComponent = registerComponent('EditUserJargonSettings', EditUserJargonSettings, {styles});

declare global {
  interface ComponentTypes {
    EditUserJargonSettings: typeof EditUserJargonSettingsComponent
  }
}
