import React from 'react';
import { registerComponent } from '../../lib/vulcan-lib/components';
// eslint-disable-next-line no-restricted-imports
import MuiMenuItem from '@material-ui/core/MenuItem';
import { Link } from '../../lib/reactRouterWrapper';

const MenuItem = ({value, disabled, dense, onClick, children}: {
  value?: string|number,
  disabled?: boolean,
  dense?: boolean,
  onClick?: (event: React.MouseEvent)=>void,
  children: React.ReactNode,
}) => {
  return <MuiMenuItem value={value} disabled={disabled} dense={dense} onClick={onClick}>{children}</MuiMenuItem>;
}

const MenuItemLink = ({to, className, rootClass, disabled, disableGutters, disableTouchRipple, onClick, children}: {
  to: string,
  className?: string,
  rootClass?: string,
  disabled?: boolean,
  disableGutters?: boolean,
  disableTouchRipple?: boolean,
  onClick?: (event: React.MouseEvent)=>void,
  children: React.ReactNode,
}) => {
  // MenuItem takes a component and passes unrecognized props to that component,
  // but its material-ui-provided type signature does not include this feature.
  // Cast to any to work around it, to be able to pass a "to" parameter.
  const MuiMenuItemUntyped = MuiMenuItem as any;

  return <MuiMenuItemUntyped
    component={Link}
    to={to}
    className={className}
    rootClass={rootClass}
    disabled={disabled}
    disableGutters={disableGutters}
    disableTouchRipple={disableTouchRipple}
    onClick={onClick}
  >
    {children}
  </MuiMenuItemUntyped>
}

const MenuItemComponent = registerComponent("MenuItem", MenuItem);
const MenuItemLinkComponent = registerComponent("MenuItemLink", MenuItemLink);

declare global {
  interface ComponentTypes {
    MenuItem: typeof MenuItemComponent
    MenuItemLink: typeof MenuItemLinkComponent
  }
}
