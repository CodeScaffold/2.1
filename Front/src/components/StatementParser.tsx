import React, {useCallback, useEffect, useState} from "react";
import {
  Box,
  Button,
  CircularProgress,
  Fade,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Skeleton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {createTheme, ThemeProvider, useTheme} from "@mui/material/styles";
import DropZone from "./dropZone";
import {parseUnifiedStatement} from "../utils/metaParser";
import {AccountType, AnalysisResult, StatementParserProps, UpgradePendingAccount} from "../utils/types";
import TradingAnalysis from "././rules/NewTradingAnalysis";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import {API_URL} from "./settings";
import {enqueueSnackbar} from "notistack";
import {useQuery} from '@tanstack/react-query';
import {ClientDetail} from './ClientDetail';
import IOSSwitch from "../utils/IOSSwitch";
import StabilityRuleUI from "./StabilityRuleUI";
import { analyzeStabilityRule } from "./rules/stabilityRule";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import { useOpoAuth } from "../OpoAuth";

const darkTheme = createTheme({ palette: { mode: "dark" } });
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 6 + ITEM_PADDING_TOP,
      width: 300,
    },
  },
};

const accountTypes = [
  AccountType.FLASH,
  AccountType.LEGEND,
  AccountType.PEAK_SCALP,
  AccountType.BLACK,
];

const functions = ["30-second", "hedging", "80% profit", "50% Margin", "Stability Rule"];

const StatementParser: React.FC<StatementParserProps> = ({
                                                           accountPhase,
                                                           profitTargetPercentage,
                                                           funded,
                                                         }) => {
  const { isAuthenticated, isLoading: authLoading } = useOpoAuth();

  // State declarations
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [aggressiveAccount, setAggressiveAccount] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType>(AccountType.FLASH);
  const [thirtySecondTrades, setThirtySecondTrades] = useState<string>("not analyzed");
  const [HedgedGroup, setNewsHedgeTrades] = useState<string>("not analyzed");
  const [isCompliant, SetRule80Percent] = useState<string>("not analyzed");
  const [marginViolations, setMarginViolations] = useState<string>("not analyzed");
  const [stabilityRuleViolation, setStabilityRuleViolation] = useState<string>("not analyzed");
  const [agentDecision, setAgentDecision] = useState<string>("Approved");
  const [agentName, setAgentName] = useState<string>("Unknown");
  const [note, setNote] = useState<string>("");
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [pendingAccounts, setPendingAccounts] = useState<UpgradePendingAccount[]>([]);

  const login = analysisResult?.accountLogin ?? '';

  // Function to fetch and cache pending upgrade accounts
  const loadPendingAccounts = useCallback(async (): Promise<UpgradePendingAccount[]> => {
    if (authLoading || !isAuthenticated) {
      console.log('🔧 Skipping pending accounts fetch - not authenticated yet');
      return [];
    }
    try {
      console.log('🔍 Loading pending accounts with auth...');

      const res = await fetch(`${API_URL}/upgrade-pending`, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: UpgradePendingAccount[] = await res.json();
      console.log(`✅ Loaded ${data.length} pending accounts`);

      setPendingAccounts(data);
      localStorage.setItem("pendingAccounts", JSON.stringify(data));
      return data;
    } catch (err) {
      console.error("❌ Failed to load pending accounts:", err);
      return [];
    }
  }, [authLoading, isAuthenticated]);

  const { data: clientData, isLoading: clientLoading, error: clientError } = useQuery({
    queryKey: ['clientByLogin', login],
    queryFn: async () => {
      if (!login) return null;
      console.log('🔍 Fetching client data with auth...');

      const response = await fetch(`${API_URL}/client-by-login/${login}`, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch client data');
      }

      const client = await response.json();
      console.log('✅ Client data loaded successfully');

      // Normalize report fields from PascalCase to camelCase
      return {
        ...client,
        accounts: (client.accounts ?? [])
            .filter((acct: any) => acct.clientId !== 404)
            .map((acct: any) => ({
              ...acct,
              reports: (acct.reports ?? []).map((r: any) => ({
                ...r,
                agent: r.Agent ?? r.agent,
                agentDecision: r.Decision ?? r.agentDecision,
                note: r.Note ?? r.note,
                marginViolations: r.MarginViolations ?? r.marginViolations,
                rule80Percent: r.Rule80Percent ?? r.rule80Percent,
                newsHedgeTrades: r.NewsHedgeTrades ?? r.newsHedgeTrades,
                thirtySecondTrades: r.ThirtySecondTrades ?? r.thirtySecondTrades,
                stabilityRule: r.StabilityRule ?? r.stabilityRule,
              })),
            })),
      };
    },
    enabled: login !== '' && isAuthenticated && !authLoading,
    staleTime: 1000 * 60 * 5,
  });

  // Load pending accounts when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadPendingAccounts();
    }
  }, [isAuthenticated, authLoading, loadPendingAccounts]);

  // Load agentName from persisted user object
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        if (parsedUser.agentName) {
          setAgentName(parsedUser.agentName);
        }
      } catch {
        // ignore JSON parse errors
      }
    }
  }, []);

  const normalizedPhase: "phase1" | "phase2" | undefined =
      accountPhase === "phase1" || accountPhase === "phase2"
          ? accountPhase
          : undefined;

  useEffect(() => {
    async function parseFile() {
      if (!file) return;
      setIsLoading(true);
      try {
        const result = await parseUnifiedStatement(
            file,
            selectedOptions,
            aggressiveAccount,
            profitTargetPercentage,
            selectedAccountType,
            funded,
            normalizedPhase,
        );
        if (result?.error) {
          console.error("Error parsing the statement:", result.error);
        } else {
          setAnalysisResult(result);
        }
      } catch (err) {
        console.error("Error parsing statement:", err);
      } finally {
        setIsLoading(false);
      }
    }
    parseFile();
  }, [
    file,
    selectedOptions,
    aggressiveAccount,
    profitTargetPercentage,
    funded,
    selectedAccountType,
    normalizedPhase,
  ]);

  // Auto-apply settings based on programName after parsing
  useEffect(() => {
    if (!analysisResult || pendingAccounts.length === 0) return;
    const acctLogin = (analysisResult.accountLogin || "").toString();
    const acct = pendingAccounts.find(a => a.login === acctLogin);
    if (!acct) return;

    const parts = acct.programName.split(/[-•]/).map(t => t.trim()).filter(Boolean);
    const firstToken = parts[0];
    const enumKey = firstToken.toUpperCase().replace(/\s+/g, "_");
    const enumType = AccountType[enumKey as keyof typeof AccountType];
    if (enumType !== undefined) {
      setSelectedAccountType(enumType);
    }

    // Initialize function toggles only if not customized
    if (selectedOptions.length === 0) {
      setSelectedOptions(functions);
    }

    // Auto-set decision based on violations
    const hasViolations =
        (analysisResult.violations && analysisResult.violations.length > 0) ||
        stabilityRuleViolation === "yes";
    if (hasViolations) {
      setAgentDecision("Rejected");
    } else {
      setAgentDecision("Approved");
    }

    // Auto-set riskType toggle based on programName
    setAggressiveAccount(
        acct.programName.toLowerCase().includes("aggressive")
    );
  }, [analysisResult, pendingAccounts, stabilityRuleViolation, selectedOptions.length]);

  // Early return for authentication loading - AFTER all hooks
  if (authLoading) {
    return (
        <ThemeProvider theme={darkTheme}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px'
          }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Checking authentication...</Typography>
          </Box>
        </ThemeProvider>
    );
  }

  // Early return for unauthenticated users - AFTER all hooks
  if (!isAuthenticated) {
    return (
        <ThemeProvider theme={darkTheme}>
          <Box sx={{ p: 3 }}>
            <Typography color="error">Authentication required to access this page.</Typography>
          </Box>
        </ThemeProvider>
    );
  }

  const handleOptionsChange = (event: any) => {
    const { value } = event.target;
    setSelectedOptions(typeof value === "string" ? value.split(",") : value);
  };

  const handleAccountTypeChange = (event: any) => {
    setSelectedAccountType(event.target.value as AccountType);
  };

  const getFunctionIcon = (option: string) => {
    switch (option) {
      case "30-second":
        return (
            <AccessTimeIcon
                fontSize="small"
                sx={{ mr: 1, color: "secondary.main" }}
            />
        );
      case "hedging":
        return (
            <SwapHorizIcon
                fontSize="small"
                sx={{ mr: 1, color: "secondary.main" }}
            />
        );
      case "80% profit":
        return (
            <TrendingUpIcon
                fontSize="small"
                sx={{ mr: 1, color: "secondary.main" }}
            />
        );
      case "50% Margin":
        return (
            <AccountBalanceIcon
                fontSize="small"
                sx={{ mr: 1, color: "secondary.main" }}
            />
        );
      case "Stability Rule":
        return (
            <EqualizerIcon
                fontSize="small"
                sx={{ mr: 1, color: "secondary.main" }}
            />
        );
      default:
        return null;
    }
  };

  const sendReportToDatabase = async () => {
    if (!analysisResult) return;

    const payload = {
      accountLogin: analysisResult.accountLogin || "",
      ThirtySecondTrades: thirtySecondTrades,
      NewsHedgeTrades: HedgedGroup,
      Rule80Percent: isCompliant,
      MarginViolations: marginViolations,
      StabilityRule: stabilityRuleViolation,
      Agent: agentName,
      Decision: agentDecision,
      MetaTraderVersion: analysisResult.statementType,
      AccountPhase: accountPhase,
      Note: note,
      accountType: selectedAccountType,
      riskType: aggressiveAccount ? "AGGRESSIVE" : "NORMAL",
      accountBalance: analysisResult.initialBalance,
    };

    console.log("Sending report payload to backend:", payload);

    try {
      const response = await fetch(`${API_URL}/forfxreports`, {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "An error occurred";
        try {
          const result = await response.json();
          errorMessage = result.message || errorMessage;
        } catch (error: any) {
          enqueueSnackbar(error.message || "Submission failed", {
            variant: "error",
          });
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      console.log("Report sent successfully, server responded OK");
      enqueueSnackbar("Report saved successfully", { variant: "success" });
      return true;
    } catch (error: any) {
      enqueueSnackbar(error.message || "Submission failed", {
        variant: "error",
      });
      return false;
    }
  };

  const handleSaveReport = async () => {
    if (!analysisResult) return;
    const success = await sendReportToDatabase();
    if (success) {
      setIsSaved(true);
    }
  };

  useTheme();

  return (
      <ThemeProvider theme={darkTheme}>
        <Box sx={{
          p: 3,
          marginTop: 3,
          background: 'linear-gradient(0deg, #424242 0%, #333333 100%)',
          borderRadius: 3,
          border: '1px solid #424242',
        }}>
          <Grid container spacing={2} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ height: "100%" }}>
                <Select
                    displayEmpty
                    labelId="multiple-options"
                    id="multiple-options"
                    multiple
                    value={selectedOptions}
                    onChange={handleOptionsChange}
                    MenuProps={MenuProps}
                    renderValue={(selected) => {
                      if (!selected || selected.length === 0) {
                        return (
                            <Box sx={{ width: "100%", textAlign: "left", color: "#121212" }}>
                              Choose Relevant Rules
                            </Box>
                        );
                      }
                      return selected.join(", ");
                    }}
                    sx={{
                      "& .MuiSelect-select": { color: "#121212" },
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "#121212" },
                      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#121212" },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#121212" },
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2
                    }}
                >
                  {functions.map((option) => (
                      <MenuItem
                          key={option}
                          value={option}
                          sx={{ color: "#FFFFFF" }}
                      >
                        {getFunctionIcon(option)}
                        {option}
                      </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth sx={{ height: "100%" }}>
                <Select
                    labelId="account-type-select-label"
                    id="account-type-select"
                    value={selectedAccountType}
                    onChange={handleAccountTypeChange}
                    MenuProps={MenuProps}
                    sx={{
                      "& .MuiSelect-select": { color: "#121212" },
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "#121212" },
                      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#121212" },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#121212" },
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 2
                    }}
                >
                  {accountTypes.map((type) => (
                      <MenuItem
                          key={type}
                          value={type}
                          sx={{ color: "#FFFFFF" }}
                      >
                        {type}
                      </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth sx={{ height: "100%"}}>
                <ToggleButtonGroup
                    value={aggressiveAccount ? "aggressive" : "normal"}
                    exclusive
                    onChange={(_event, newValue) => {
                      if (newValue !== null) {
                        setAggressiveAccount(newValue === "aggressive");
                      }
                    }}
                    fullWidth
                    sx={{
                      borderRadius: 2,
                      "& .MuiToggleButton-root": {
                        color: "#FFFFFF",
                        borderColor: "#121212",
                        backgroundColor: "#424242",
                        "&.Mui-selected": {
                          backgroundColor: "rgba(255, 255, 255, 0.8)",
                          color: "#121212",
                          "&:hover": {
                            backgroundColor: "#424242"
                          }
                        },
                        "&:hover": {
                          backgroundColor: "rgba(18, 18, 18, 0.1)"
                        }
                      }
                    }}
                >
                  <ToggleButton value="normal" sx={{ flex: 1 , p:"0.9rem"}}>
                    Normal
                  </ToggleButton>
                  <ToggleButton value="aggressive" sx={{ flex: 1 }}>
                    Aggressive
                  </ToggleButton>
                </ToggleButtonGroup>
              </FormControl>
            </Grid>
          </Grid>

          <DropZone
              onFileAccepted={(acceptedFile) => {
                setFile(acceptedFile);
                setIsSaved(false);
                setSelectedOptions(functions);
                loadPendingAccounts();
              }}
              fileUploaded={!!file}
          />

          {file && (
              <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    mt: 2,
                  }}
              >
                {/* Four function toggles */}
                <Box sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1, sm: 2 },
                  flexWrap: "wrap"
                }}>
                  {/* 30-second */}
                  <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        minWidth: 60,
                      }}
                  >
                    <Typography variant="caption" align="center" sx={{ mb: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                      30-second
                    </Typography>
                    <IOSSwitch
                        checked={thirtySecondTrades === "yes"}
                        onChange={(checked) =>
                            setThirtySecondTrades(checked ? "yes" : "no")
                        }
                        size="medium"
                    />
                  </Box>
                  {/* Hedging */}
                  <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        minWidth: 60,
                      }}
                  >
                    <Typography variant="caption" align="center" sx={{ mb: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                      Hedging
                    </Typography>
                    <IOSSwitch
                        checked={HedgedGroup === "yes"}
                        onChange={(checked) =>
                            setNewsHedgeTrades(checked ? "yes" : "no")
                        }
                        size="medium"
                    />
                  </Box>
                  {/* 80% Profit */}
                  <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        minWidth: 60,
                      }}
                  >
                    <Typography variant="caption" align="center" sx={{ mb: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                      80% Profit
                    </Typography>
                    <IOSSwitch
                        checked={isCompliant === "yes"}
                        onChange={(checked) =>
                            SetRule80Percent(checked ? "yes" : "no")
                        }
                        size="medium"
                    />
                  </Box>
                  {/* 50% Margin */}
                  <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        minWidth: 60,
                      }}
                  >
                    <Typography variant="caption" align="center" sx={{ mb: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                      50% Margin
                    </Typography>
                    <IOSSwitch
                        checked={marginViolations === "yes"}
                        onChange={(checked) =>
                            setMarginViolations(checked ? "yes" : "no")
                        }
                        size="medium"
                    />
                  </Box>
                  {/* Stability Rule */}
                  <Box sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minWidth: 60,
                  }}>
                    <Typography variant="caption" align="center" sx={{ mb: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                      Stability
                    </Typography>
                    <IOSSwitch
                        checked={stabilityRuleViolation === "yes"}
                        onChange={(checked) =>
                            setStabilityRuleViolation(checked ? "yes" : "no")
                        }
                        size="medium"
                    />
                  </Box>
                </Box>

                <Box sx={{
                  display: "flex",
                  alignItems: "center",
                  mr: 2,
                }}>
                  <Typography
                      variant="h6"
                      sx={{ mr: 3, mt:1, color: "#FFFFFF", fontWeight: "bold"}}
                  >
                    {agentName.charAt(0).toUpperCase() + agentName.slice(1)}
                  </Typography>
                  <FormControl
                      sx={{
                        minWidth: "2.5rem",
                        "& .MuiInputBase-root": { height: "2.5rem" },
                      }}
                      size="medium"
                  >
                    <Select
                        value={agentDecision}
                        onChange={(e) => setAgentDecision(e.target.value)}
                        variant="outlined"
                        sx={{
                          fontSize: "1rem",
                          backgroundColor: "rgba(255, 255, 255, 0.8)",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#121212",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#121212",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#121212",
                          },
                          "& .MuiSelect-select": {
                            textAlign: "right",
                            color: "#121212"
                          },
                        }}
                    >
                      <MenuItem value="Approved">Approved</MenuItem>
                      <MenuItem value="Rejected">Rejected</MenuItem>
                      <MenuItem value="Review">Under Review</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                      label="note"
                      variant="outlined"
                      size="small"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      sx={{
                        ml: 2,
                        "& .MuiOutlinedInput-root": {
                          backgroundColor: "rgba(255, 255, 255, 0.8)",
                          "& fieldset": {
                            borderColor: "#121212",
                          },
                          "&:hover fieldset": {
                            borderColor: "#121212",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#121212",
                          },
                        },
                        "& .MuiInputLabel-root": {
                          color: "#121212",
                        },
                        "& .MuiInputBase-input": {
                          color: "#121212",
                        }
                      }}
                  />
                </Box>

                <Box sx={{ textAlign: "right" }}>
                  <Button
                      variant="contained"
                      size="large"
                      onClick={handleSaveReport}
                      disabled={isLoading || isSaved}
                      sx={{
                        backgroundColor: "#121212",
                        color: "#EBEDF2",
                        "&:hover": {
                          backgroundColor: "#262618",
                        },
                        "&:disabled": {
                          backgroundColor: "rgba(18, 18, 18, 0.5)",
                          color: "rgba(235, 237, 242, 0.5)",
                        }
                      }}
                  >
                    {isLoading ? "Saving..." : isSaved ? "Saved" : "Save Report"}
                  </Button>
                </Box>
              </Box>
          )}
          <Box sx={{ mt: 4 }}>
            <Fade in={isLoading} timeout={500} unmountOnExit>
              <Box>
                <Skeleton
                    variant="rectangular"
                    height={200}
                    animation="wave"
                    sx={{ mb: 2 }}
                />
                <Skeleton variant="text" height={40} animation="wave" />
                <Skeleton variant="text" height={40} animation="wave" />
              </Box>
            </Fade>
            <Fade in={!isLoading && !!analysisResult} timeout={500} unmountOnExit>
              <Box>
                {analysisResult && <TradingAnalysis result={analysisResult} />}
                {/* Stability Rule UI */}
                {analysisResult &&
                    (analysisResult as any).allTrades &&
                    selectedOptions.includes("Stability Rule") && (
                        <Box sx={{ mt: 4 }}>
                          <StabilityRuleUI
                              stabilityResult={analyzeStabilityRule(
                                  (analysisResult as any).allTrades || [],
                                  analysisResult.totalNetProfit || 0
                              )}
                          />
                        </Box>
                    )}
                {analysisResult && clientData && (
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mt: 4,
                      mb: 2
                    }}>
                      <Box sx={{
                        flex: 1,
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent 0%, #121212 50%, transparent 100%)'
                      }} />
                      <Typography
                          variant="body2"
                          sx={{
                            mx: 2,
                            color: '#FFFFFF',
                            fontSize: '0.875rem',
                            fontWeight: 500
                          }}
                      >
                        Previous Reviews
                      </Typography>
                      <Box sx={{
                        flex: 1,
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent 0%, #121212 50%, transparent 100%)'
                      }} />
                    </Box>
                )}
                {/* Render review history for the parsed account before saving */}
                {clientData && (
                    <Box sx={{
                      mt: 4,
                      p: 3,
                      background: 'linear-gradient(0deg, #121212 0%, #D2D4D9 100%)',
                      borderRadius: 3,
                      border: '1px solid #121212',
                    }}>

                      {clientLoading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress
                                size={32}
                                sx={{ color: '#121212' }}
                            />
                          </Box>
                      ) : clientError ? (
                          <Box sx={{
                            p: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: 2,
                            border: '1px solid #ff5252'
                          }}>
                            <Typography color="error" sx={{ color: '#d32f2f' }}>
                              Error loading client data: {clientError.message}
                            </Typography>
                          </Box>
                      ) : (
                          <Box sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: 2,
                            border: '1px solid #121212',
                            overflow: 'hidden'
                          }}>
                            <ClientDetail client={clientData} />
                          </Box>
                      )}
                    </Box>
                )}
              </Box>
            </Fade>
          </Box>
        </Box>
      </ThemeProvider>
  );
};

export default StatementParser;