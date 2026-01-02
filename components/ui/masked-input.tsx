'use client';

import * as React from 'react';

interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask: string;
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
      }

         

export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
({ mask, className, onChange, value, ...props }, ref) => {
        const applyMask = (value: string, mask: string) => {
            let i = 0;
            const cleanValue = value.replace(/\D/g, '');
            let maskedValue = '';

            for (const m of mask) {
                if (i >= cleanValue.length) break;

                if (m === '9') {
                    maskedValue += cleanValue[i];
                    i++;
                } else {
                    maskedValue += m;
                }
            }
            return maskedValue;
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = applyMask(e.target.value, mask);
            e.target.value = newValue;
            if (onChange) onChange(e);
        };

  return (<Input ref={ref} onChange={handleChange} className={className} value={value} {...props} />);
    });
