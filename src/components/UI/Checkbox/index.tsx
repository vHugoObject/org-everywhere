import { Motion, spring } from 'react-motion';

import { interpolateColorsAndReturnCSS, createColorObject } from '../../../lib/color';

import './stylesheet.css';

export default ({ state, onClick }) => {
  const uncheckedColor = createColorObject(255, 255, 255, 1);
  const checkedColor = createColorObject(238, 232, 213, 1);

  const checkboxStyle = {
    colorFactor: spring(
      {
        checked: 1,
        partial: 1,
        unchecked: 0,
      }[state],
      { stiffness: 300 }
    ),
  };

  return (
    <Motion style={checkboxStyle}>
      {(style) => {
        const backgroundColor = 
          interpolateColorsAndReturnCSS(uncheckedColor, checkedColor, style.colorFactor)

        return (
          <div className="checkbox" onClick={onClick} style={{ backgroundColor }}>
            <div className="checkbox__inner-container">
              {state === 'checked' && <i className="fas fa-check" />}
              {state === 'partial' && <i className="fas fa-minus" />}
              {state === 'unchecked' && <i className="fas fa-square" />}
            </div>
          </div>
        );
      }}
    </Motion>
  );
};
