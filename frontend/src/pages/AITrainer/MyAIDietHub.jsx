import React from 'react';
import FoodLogPage from '../../features/foodLogging/FoodLogPage';

/**
 * MyAIDietHub (Phase 1 & Phase 4 Compliance)
 * In accordance with Product Rule R2:
 * NO diet plan is ever generated or assigned by AI or the system.
 * Diet is strictly TRACK + REPORT only.
 * Renders the weekly index (Weeks, Days, Subah, Dopahar, Shaam, Raat, Extra)
 * and the paginated Pakistani food & recipe library.
 */
const MyAIDietHub = ({ activeProgram }) => {
  return <FoodLogPage activeProgram={activeProgram} />;
};

export default MyAIDietHub;
