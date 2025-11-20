// src/components/report/SummaryCards.tsx
import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
} from "@mui/material";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import VerifiedIcon from "@mui/icons-material/Verified";
import IndeterminateCheckBoxIcon from "@mui/icons-material/IndeterminateCheckBox";
import ApprovalProgress from "./ApprovalProgress";
import {alpha, useTheme} from "@mui/material/styles";

interface SummaryCardsProps {
  totalStatements: number;
  approvedCount: number;
  rejectedCount: number;
  approvedRatio: number;
  rejectedRatio: number;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalStatements,
  approvedCount,
  rejectedCount,
  approvedRatio,
  rejectedRatio,
}) => {
    const theme = useTheme();

    return (
    <Grid container spacing={3} sx={{ mb: 1 }}>
      <Grid item xs={12} md={3}>
        <Card
          sx={{
              backgroundColor: alpha(theme.palette.background.paper, 0.5),
            boxShadow: 3,
            mb: 3,
            borderRadius: 2,
            height: "130px",
            width: "100%",
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
              <div>
                <Typography
                  color="textSecondary"
                  gutterBottom
                  variant="overline"
                >
                  STATEMENTS
                </Typography>
                <Typography variant="h4">Total {totalStatements}</Typography>
              </div>
              <Avatar
                sx={{ backgroundColor: "primary.main", height: 56, width: 56 }}
              >
                <DonutLargeIcon />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card
          sx={{
              backgroundColor: alpha(theme.palette.background.paper, 0.5),
            boxShadow: 3,
            mb: 3,
            borderRadius: 2,
            height: "130px",
            width: "100%",
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
              <div>
                <Typography
                  color="textSecondary"
                  gutterBottom
                  variant="overline"
                >
                  Approve
                </Typography>
                <Typography variant="h4">Approved {approvedCount}</Typography>
              </div>
              <Avatar
                sx={{ backgroundColor: "primary.main", height: 56, width: 56 }}
              >
                <VerifiedIcon />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card
          sx={{
              backgroundColor: alpha(theme.palette.background.paper, 0.5),
            boxShadow: 3,
            mb: 3,
            borderRadius: 2,
            height: "130px",
            width: "100%",
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
              <div>
                <Typography
                  color="textSecondary"
                  gutterBottom
                  variant="overline"
                >
                  Reject
                </Typography>
                <Typography variant="h4">Rejected {rejectedCount}</Typography>
              </div>
              <Avatar
                sx={{ backgroundColor: "primary.main", height: 56, width: 56 }}
              >
                <IndeterminateCheckBoxIcon />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <ApprovalProgress
          approved={approvedRatio}
          rejected={rejectedRatio}
          sx={{ mb: 1 }}
        />
      </Grid>
    </Grid>
  );
};

export default SummaryCards;
