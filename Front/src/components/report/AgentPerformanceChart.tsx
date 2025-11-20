import React from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import "../../style.css";

type ViolationReason =
  | "Under 30 Seconds"
  | "80% Profit Target"
  | "50% Margin"
  | "Hedge Trade Violation";

export interface Report {
  id: number;
  accountLogin: string;
  violations: string[];
  agentDecision: string;
  agent: string;
  createdAt: string;
  accountPhase: string;
  metaTraderVersion: string;
  note: string;
}

interface AgentPerformanceChartProps {
  reports: Report[];
}

const AgentPerformanceChart: React.FC<AgentPerformanceChartProps> = ({
  reports,
}) => {
  const agentData: {
    [agent: string]: {
      approved: number;
      "Under 30 Seconds": number;
      "80% Profit Target": number;
      "50% Margin": number;
      "Hedge Trade Violation": number;
      "Multiple Violations": number;
    };
  } = {};

  reports.forEach((report) => {
    const agent = report.agent ? report.agent.toUpperCase() : "UNKNOWN";
    if (!agentData[agent]) {
      agentData[agent] = {
        approved: 0,
        "Under 30 Seconds": 0,
        "80% Profit Target": 0,
        "50% Margin": 0,
        "Hedge Trade Violation": 0,
        "Multiple Violations": 0,
      };
    }
    if (report.agentDecision === "Approved") {
      agentData[agent].approved++;
    } else if (report.agentDecision === "Rejected") {
      if (report.violations.length > 1) {
        agentData[agent]["Multiple Violations"]++;
      } else if (report.violations.length === 1) {
        const reason = report.violations[0];
        if (
          [
            "Under 30 Seconds",
            "80% Profit Target",
            "50% Margin",
            "Hedge Trade Violation",
          ].includes(reason)
        ) {
          agentData[agent][reason as ViolationReason]++;
        }
      }
    }
  });

  const agents = Object.keys(agentData);
  const approvedSeries = agents.map((agent) => agentData[agent].approved);
  const under30Series = agents.map(
    (agent) => agentData[agent]["Under 30 Seconds"],
  );
  const profitTargetSeries = agents.map(
    (agent) => agentData[agent]["80% Profit Target"],
  );
  const marginSeries = agents.map((agent) => agentData[agent]["50% Margin"]);
  const hedgeSeries = agents.map(
    (agent) => agentData[agent]["Hedge Trade Violation"],
  );
  const multipleSeries = agents.map(
    (agent) => agentData[agent]["Multiple Violations"],
  );

  const series = [
    {
      name: "Approved",
      data: approvedSeries,
    },
    {
      name: "Under 30 Seconds",
      data: under30Series,
    },
    {
      name: "80% Profit Target",
      data: profitTargetSeries,
    },
    {
      name: "50% Margin",
      data: marginSeries,
    },
    {
      name: "Hedge Trade Violation",
      data: hedgeSeries,
    },
    {
      name: "Multiple Violations",
      data: multipleSeries,
    },
  ];

  const options: ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
    },
    colors: [
      "#00E396", // Approved
      "#2196f3", // Under 30 Seconds
      "#ff9800", // 80% Profit Target
      "#9c27b0", // 50% Margin
      "#f44336", // Hedge Trade Violation
      "#ffc107", // Multiple Violations
    ],
    plotOptions: {
      bar: {
        horizontal: true,
      },
    },
    xaxis: {
      categories: agents,
      labels: {
        style: {
          colors: "#fff",
          fontSize: "14px",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#fff",
          fontSize: "16px",
        },
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "18px",
      },
    },
    tooltip: {
      theme: "dark",
      style: {
        fontSize: "14px",
      },
    },
    legend: {
      labels: {
        colors: "#fff",
      },
    },
  };

  return (
    <Chart
      options={options}
      series={series}
      type="bar"
      height={360}
      width="100%"
      className="custom-legend"
    />
  );
};

export default AgentPerformanceChart;
