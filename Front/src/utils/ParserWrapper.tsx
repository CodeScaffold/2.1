import StatementParser from "../components/StatementParser";
import { WrapperParams } from "./types.ts";
import { useParams } from "react-router-dom";

const StatementParserWrapper = () => {
  const { phase } = useParams<WrapperParams>();
  const normalizedPhase = phase?.toLowerCase().trim();
  let profitTargetPercentage: number | undefined = undefined;
  console.log(
    "Phase:",
    phase,
    "Profit Target Percentage:",
    profitTargetPercentage,
  );

  // Set options for informational purposes if needed.
  let funded = false;
  if (normalizedPhase === "phase1") {
  } else if (normalizedPhase === "phase2") {
  } else if (normalizedPhase === "funded") {
    funded = true;
  }

  return (
    <StatementParser
      accountPhase={normalizedPhase}
      profitTargetPercentage={profitTargetPercentage}
      funded={funded}
      MetaTraderVersion={""}
    />
  );
};

export default StatementParserWrapper;
