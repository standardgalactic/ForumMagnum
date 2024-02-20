import React from 'react'
import { registerComponent, Components } from '../../lib/vulcan-lib';
import { FormGroupLayoutProps } from './FormGroupLayout';
import { hasGoogleDocImport } from '../../lib/betas';
import { useLocation } from '../../lib/routeUtil';

// We want the buttons to go _above_ the tabs when the space gets too tight,
// which requires some special breakpoint logic (due to the how the central column
// both expands and contracts as you reduce the screen size):
// - Use the row layout above 1050px, and between 600px and the "md" breakpoint (around 950px)
// - Otherwise use the column layout, with the buttons above
const styles = (theme: ThemeType) => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    borderBottom: theme.palette.border.normal,
    margin: '16px 16px',
    alignItems: 'center',
    flexDirection: "column",
    '& .form-input': {
      margin: 0,
    },
    [`@media (min-width: 1050px)`]: {
      flexDirection: "row",
    },
    [`@media (min-width: 600px) and (max-width: ${theme.breakpoints.values.md}px)`]: {
      flexDirection: "row",
    },
  },
  tabs: {
    order: 2,
    marginRight: 'auto',
    [`@media (min-width: 1050px)`]: {
      order: 1,
      flexBasis: 'auto',
    },
    [`@media (min-width: 600px) and (max-width: ${theme.breakpoints.values.md}px)`]: {
      order: 1,
      flexBasis: 'auto',
    },
  },
  otherChildren: {
    order: 1,
    marginLeft: 'auto',
    display: "flex",
    gap: "2px",
    [`@media (min-width: 1050px)`]: {
      order: 2,
      flexBasis: 'auto',
    },
    [`@media (min-width: 600px) and (max-width: ${theme.breakpoints.values.md}px)`]: {
      order: 2,
      flexBasis: 'auto',
    },
  },
});

const FormGroupPostTopBar = ({ children, classes }: FormGroupLayoutProps & { classes: ClassesType<typeof styles> }) => {
  const childrenArray = React.Children.toArray(children);
  const [tabs, ...otherChildren] = childrenArray;

  const { query } = useLocation();
  const postId = query.postId;

  const { GoogleDocImportButton } = Components;

  return (
    <div className={classes.root}>
      <div className={classes.tabs}>{tabs}</div>
      <div className={classes.otherChildren}>
        {hasGoogleDocImport && <GoogleDocImportButton postId={postId} />}
        {otherChildren}
      </div>
    </div>
  );
};

const FormGroupPostTopBarComponent = registerComponent('FormGroupPostTopBar', FormGroupPostTopBar, { styles })

declare global {
  interface ComponentTypes {
    FormGroupPostTopBar: typeof FormGroupPostTopBarComponent
  }
}
