import React, { useCallback } from "react";
import { Paper, Typography, Box } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useDropzone } from "react-dropzone";

interface DropZoneProps {
    onFileAccepted: (file: File) => void;
    fileUploaded: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({
                                               onFileAccepted,
                                               fileUploaded,
                                           }) => {
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                onFileAccepted(acceptedFiles[0]);
            }
        },
        [onFileAccepted],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "text/html": [".htm", ".html"],
        },
    });

    return (
        <Paper
            {...getRootProps()}
            sx={{
                background: fileUploaded
                    ? 'linear-gradient(135deg, #0D0D0D 0%, #262618 100%)'
                    : 'linear-gradient(135deg, #EBEDF2 0%, #D2D4D9 100%)',
                p: 4,
                textAlign: "center",
                border: fileUploaded
                    ? '2px dashed #72735F'
                    : '2px dashed #121212',
                cursor: "pointer",
                mt: 2,
                borderRadius: 3,
                minHeight: fileUploaded ? "80px" : "200px",
                transition: "all 0.3s ease",
                opacity: fileUploaded ? 0.8 : 1,
                color: fileUploaded ? '#EBEDF2' : '#0D0D0D',
                boxShadow: fileUploaded
                    ? '0 8px 32px rgba(114, 115, 95, 0.2)'
                    : '0 8px 32px rgba(13, 13, 13, 0.1)',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: fileUploaded
                        ? '0 12px 40px rgba(114, 115, 95, 0.3)'
                        : '0 12px 40px rgba(13, 13, 13, 0.2)',
                    background: fileUploaded
                        ? 'linear-gradient(135deg, #262618 0%, #0D0D0D 100%)'
                        : 'linear-gradient(135deg, #D2D4D9 0%, #EBEDF2 100%)',
                },
                '&:active': {
                    transform: 'translateY(0px)',
                }
            }}
        >
            <input {...getInputProps()} />
            <Box
                sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
                <CloudUploadIcon
                    sx={{
                        fontSize: 48,
                        mb: 2,
                        color: fileUploaded ? '#72735F' : '#121212',
                        textShadow: fileUploaded
                            ? '0 2px 4px rgba(0,0,0,0.5)'
                            : '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                />
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 600,
                        textShadow: fileUploaded
                            ? '0 2px 4px rgba(0,0,0,0.5)'
                            : '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                >
                    {isDragActive
                        ? "Drop the file here..."
                        : fileUploaded
                            ? "File uploaded. Drag a new file to replace it."
                            : "Drop your statement here, or click here to upload"}
                </Typography>
                {!fileUploaded && (
                    <Typography
                        variant="body2"
                        sx={{
                            mt: 1,
                            opacity: 0.8,
                            fontSize: '0.9rem',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        }}
                    >
                        Accepts .htm and .html files
                    </Typography>
                )}
            </Box>
        </Paper>
    );
};

export default DropZone;