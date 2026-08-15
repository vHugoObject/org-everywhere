import React, { type Ref, type CSSProperties } from "react";
import "./stylesheet.css";
import { getIcon } from "../../../../../UI/icons.tsx";
import classNames from "classnames";

interface ActionButtonArguments {
  iconName: string;
  subIconName: string;
  onClick: Function;
  onRef: Ref<HTMLButtonElement>;
  isDisabled: boolean;
  shouldRotateSubIcon: boolean;
  shouldSpinSubIcon: boolean;
  letter: string;
  additionalClassName: string;
  style: CSSProperties;
  tooltip: string;
}
const ActionButton = ({
  iconName,
  subIconName,
  onClick,
  isDisabled,
  onRef,
  shouldRotateSubIcon,
  shouldSpinSubIcon,
  additionalClassName,
  letter,
  style,
  tooltip,
}: ActionButtonArguments) => {
  const handleClick = () => {
    if (isDisabled) {
      return;
    }
    onClick();
  };

  const className = classNames(
    "btn",
    "btn--circle",
    "action-drawer__btn",
    additionalClassName || "",
    {
      fas: !letter,
      "fa-lg": !letter,
      [`fa-${iconName}`]: !letter,
      "action-drawer__btn--with-sub-icon": !!subIconName,
      "btn--disabled": isDisabled,
      "action-drawer__btn--letter": !!letter,
    },
  );

  // const subIconClassName = classNames(
  //   'fas',
  //   'fa-xs',
  //   `fa-${subIconName}`,
  //   'action-drawer__btn__sub-icon',
  //   {
  //     'action-drawer__btn__sub-icon--rotated': shouldRotateSubIcon,
  //     'fa-spin': shouldSpinSubIcon,
  //   }
  // )

  return (
    <button
      onClick={handleClick}
      className={className}
      style={style}
      title={tooltip}
      ref={onRef}
    >
      {letter && letter}
      {getIcon(iconName)}
      {subIconName && getIcon(iconName)}
    </button>
  );
};

export default ActionButton;
