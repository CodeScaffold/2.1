import React from 'react';
import { styled } from "@mui/material/styles";
import Switch, { SwitchProps } from "@mui/material/Switch";

interface IOSSwitchProps extends Omit<SwitchProps, 'onChange' | 'size'> {
    checked?: boolean;
    onChange?: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    size?: 'small' | 'medium' | 'large';
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

const StyledSwitch = styled((props: SwitchProps) => (
    <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
), {
    shouldForwardProp: (prop) => prop !== 'switchSize' && prop !== 'switchColor',
})<{ switchSize?: 'small' | 'medium' | 'large'; switchColor?: string }>(({ theme, switchSize = 'medium', switchColor = '#72735F' }) => {
    const sizes = {
        small: { width: 32, height: 20, thumbSize: 16, translateX: 12 },
        medium: { width: 42, height: 26, thumbSize: 22, translateX: 16 },
        large: { width: 52, height: 32, thumbSize: 28, translateX: 20 },
    };

    const size = sizes[switchSize];

    return {
        width: size.width,
        height: size.height,
        padding: 0,
        "& .MuiSwitch-switchBase": {
            padding: 0,
            margin: 2,
            transitionDuration: "300ms",
            "&.Mui-checked": {
                transform: `translateX(${size.translateX}px)`,
                color: "#fff",
                "& + .MuiSwitch-track": {
                    background: `linear-gradient(135deg, ${switchColor} 0%, #262618 100%)`,
                    opacity: 1,
                    border: 0,
                    boxShadow: '0 2px 8px rgba(114, 115, 95, 0.4)',
                },
                "&.Mui-disabled + .MuiSwitch-track": {
                    opacity: 0.3,
                    background: '#39393D',
                },
            },
            "&.Mui-focusVisible .MuiSwitch-thumb": {
                color: switchColor,
                border: `4px solid ${switchColor}`,
                boxShadow: `0 0 0 2px #0D0D0D, 0 0 0 4px ${switchColor}`,
            },
            "&.Mui-disabled .MuiSwitch-thumb": {
                color: '#39393D',
                backgroundColor: '#39393D',
            },
            "&.Mui-disabled + .MuiSwitch-track": {
                opacity: 0.2,
                background: '#39393D',
            },
        },
        "& .MuiSwitch-thumb": {
            boxSizing: "border-box",
            width: size.thumbSize,
            height: size.thumbSize,
            background: 'linear-gradient(135deg, #EBEDF2 0%, #D2D4D9 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: theme.transitions.create(['background', 'box-shadow'], {
                duration: 300,
            }),
            "&:hover": {
                background: 'linear-gradient(135deg, #fff 0%, #EBEDF2 100%)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.3)',
            },
        },
        "& .MuiSwitch-track": {
            borderRadius: size.height / 2,
            background: 'linear-gradient(135deg, #39393D 0%, #262618 100%)',
            opacity: 1,
            border: '1px solid #262618',
            transition: theme.transitions.create(["background-color", "box-shadow"], {
                duration: 300,
            }),
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
        },
        "&:hover": {
            "& .MuiSwitch-track": {
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4), 0 2px 8px rgba(114, 115, 95, 0.2)',
            },
        },
    };
});

const IOSSwitch: React.FC<IOSSwitchProps> = ({
                                                 checked = false,
                                                 onChange,
                                                 disabled = false,
                                                 size = 'large',
                                                 color = 'primary',
                                                 ...props
                                             }) => {
    const colorMap = {
        primary: '#37D8ED',
        secondary: '#D2D4D9',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#D92525',
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (onChange) {
            onChange(event.target.checked, event);
        }
    };

    return (
        <StyledSwitch
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            switchSize={size}
            switchColor={colorMap[color]}
            {...props}
        />
    );
};

export default IOSSwitch;