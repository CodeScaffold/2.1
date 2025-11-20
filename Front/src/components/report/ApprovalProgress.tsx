import React from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  SxProps,
} from "@mui/material";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import {alpha, useTheme} from "@mui/material/styles";

export interface ApprovalProgressProps {
  approved: number;
  rejected: number;
  sx?: SxProps;
}

const ApprovalProgress: React.FC<ApprovalProgressProps> = ({
  approved,
  rejected,
  sx,
}) => {
    const theme = useTheme();

    return (
    <Card
      sx={{
        backgroundColor: alpha(theme.palette.background.paper, 0.5),
        boxShadow: 3,
        mb: 3,
        borderRadius: 2,
        height: "130px",
        width: "100%",
        ...sx,
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline">
              APPROVAL RATIO
            </Typography>
            <Typography variant="h4">
              {Math.round(approved)}% / {Math.round(rejected)}%
            </Typography>
          </Box>
          <Avatar
            sx={{
              backgroundColor: "primary.main",
              height: 56,
              width: 56,
            }}
          >
            <FormatListBulletedIcon />
          </Avatar>
        </Box>
        <Box
          sx={{
            backgroundColor: "#e7e7e7",
            borderRadius: 2,
            overflow: "hidden",
            height: "18px",
            width: "80%",
          }}
        >
          <Box
            sx={{
              width: `${approved}%`,
              backgroundColor: "#00E396",
              height: "100%",
              display: "inline-block",
            }}
          />
          <Box
            sx={{
              width: `${rejected}%`,
              backgroundColor: "#FF4560",
              height: "100%",
              display: "inline-block",
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default ApprovalProgress;
