import React, { useCallback } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useDropzone } from 'react-dropzone';

interface DropZoneProps {
    onFileAccepted: (file: File) => void;
    fileUploaded: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ onFileAccepted, fileUploaded }) => {
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                onFileAccepted(acceptedFiles[0]);
            }
        },
        [onFileAccepted]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/html': ['.htm', '.html'],
        },
    });

    return (
        <Paper
            {...getRootProps()}
            sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed #ccc',
                cursor: 'pointer',
                mt: 2,
                borderRadius: '16px',
                minHeight: fileUploaded ? '80px' : '200px',
                transition: 'min-height 0.3s ease, opacity 0.3s ease',
                opacity: fileUploaded ? 0.6 : 1,
            }}
        >
            <input {...getInputProps()} />
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CloudUploadIcon sx={{ fontSize: 48, mb: 2, color: 'primary.main' }} />
                <Typography variant="h6">
                    {isDragActive
                        ? 'Drop the file here...'
                        : fileUploaded
                            ? 'File uploaded. Drag a new file to replace it.'
                            : 'Drop your MT5 statement here, or click here to upload'}
                </Typography>
            </Box>
        </Paper>
    );
};

export default DropZone;