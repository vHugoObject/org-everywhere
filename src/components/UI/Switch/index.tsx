import { Motion, spring } from 'react-motion';

import { interpolateColorsAndReturnCSS, createColorObject } from '../../../lib/color';

import './stylesheet.css';

export default ({ isEnabled, onToggle }) => {
  const disabledColor = createColorObject(255, 255, 255, 1);
  const enabledColor = createColorObject(238, 232, 213, 1);

  const switchStyle = {
    colorFactor: spring(isEnabled ? 1 : 0, { stiffness: 300 }),
  };

  const grabberStyle = {
    marginLeft: spring(isEnabled ? 42 : 0, { stiffness: 300 }),
  };

  return (
    <Motion style={switchStyle}>
      {(style) => {
        const backgroundColor = 
          interpolateColorsAndReturnCSS(disabledColor, enabledColor, style.colorFactor)

        return (
          <div className="switch" style={{ backgroundColor }} onClick={onToggle}>
            <Motion style={grabberStyle}>
              {(style) => <div className="switch__grabber" style={style} />}
            </Motion>
          </div>
        );
      }}
    </Motion>
  );
};
