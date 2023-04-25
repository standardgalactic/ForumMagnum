import React, { useState } from 'react';
import { Components, getFragment, registerComponent } from '../../lib/vulcan-lib';
import { ModerationTemplates } from "../../lib/collections/moderationTemplates";
import { userCanDo } from "../../lib/vulcan-users";
import { useCurrentUser } from "../common/withUser";
import {useMulti} from "../../lib/crud/withMulti";
import { ALLOWABLE_COLLECTIONS } from '../../lib/collections/moderationTemplates/schema';
import classNames from 'classnames';

const styles = (theme: ThemeType): JssStyles => ({
  form: {
    border: theme.palette.border.commentBorder,
    padding: 12,
    paddingLeft: 16,
    background: theme.palette.panelBackground.default,
  },
  filter: {
    ...theme.typography.body2,
    padding: 8,
    border: theme.palette.border.commentBorder,
    borderRadius: 2,
    cursor: "pointer",
    marginRight: 8,
    background: theme.palette.panelBackground
  },
  filterSelected: {
    backgroundColor: theme.palette.grey[200]
  }
});

//a page for creating and viewing moderation templates
export const ModerationTemplatesPage = ({classes}: {
  classes: ClassesType,
}) => {
  const { WrappedSmartForm, SingleColumnSection, SectionTitle, ModerationTemplateItem, BasicFormStyles, Loading, Row } = Components
  
  const currentUser = useCurrentUser();
  const [showDeleted, setShowDeleted] = useState<boolean>(false);
  const [filter, setFilter] = useState<string|null>(null);
  
  const { results: moderationTemplates = [], loading } = useMulti({
    collectionName: 'ModerationTemplates',
    fragmentName: 'ModerationTemplateFragment',
    terms: {
      view: "moderationTemplatesPage",
      limit: 100
    }
  });
  
  if (!userCanDo(currentUser, 'moderationTemplates.edit.all')) return null
  
  const nonDeletedTemplates = moderationTemplates.filter(template => !template.deleted)
  const deletedTemplates = moderationTemplates.filter(template => template.deleted)

  const handleFilter = (type:string) => {
    if (filter === type) {
      setFilter(null)
    } else {
      setFilter(type)
    }
  }

  return <SingleColumnSection>
    <SectionTitle title={'New Moderation Template'} />
    <div className={classes.form}>
      <BasicFormStyles>
        <WrappedSmartForm
          collectionName="ModerationTemplates"
          mutationFragment={getFragment('ModerationTemplateFragment')}
        />
      </BasicFormStyles>
    </div>
    <SectionTitle title="Moderation Templates">
      <Row justifyContent='flex-start'>
        {ALLOWABLE_COLLECTIONS.map(type => 
        <div 
          key={type} 
          onClick={() => handleFilter(type)} 
          className={classNames(classes.filter, {[classes.filterSelected]: type === filter})}
        >
          {type}
        </div>)}
      </Row>
    </SectionTitle>
    {loading && <Loading/>}
    {nonDeletedTemplates.map(template => {
      if (template.collectionName === filter || !filter) {
        return <ModerationTemplateItem key={template._id} template={template}/>
      }
    })}
    
    <a aria-role="button" onClick={() => setShowDeleted(!showDeleted)}>Show Deleted</a>
    
    {showDeleted && deletedTemplates.map(template => {
      if (template.collectionName === filter || !filter) {
        return <ModerationTemplateItem key={template._id} template={template}/>
      }
    })}
  </SingleColumnSection>
}
  

const ModerationTemplatesPageComponent = registerComponent('ModerationTemplatesPage', ModerationTemplatesPage, {styles});

declare global {
  interface ComponentTypes {
    ModerationTemplatesPage: typeof ModerationTemplatesPageComponent
  }
}

