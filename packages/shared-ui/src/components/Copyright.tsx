import * as React from 'react';
import Typography from '@mui/material/Typography';
import styled from '@emotion/styled';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

const StyledFooter = styled.footer`
  width: 100%;
  max-width: 448px;
  margin: auto auto 24px auto;
  padding: 24px 16px 0 16px;
  box-sizing: border-box;
  text-align: center;
`;

export default function Copyright() {
  return (
    <>
      {/* Footer Anchor */}
      <StyledFooter>
        <Typography variant="caption" sx={{ display: 'block', color: '#5f5e5e', mb: 2 }}>
          © 2024 Enterprise Analytics. Secure Environment.
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {['Privacy Policy', 'Terms of Service', 'Security Center', 'Help Desk'].map((item) => (
            <Button
              key={item}
              variant="text"
              sx={{
                p: 0,
                color: '#5f5e5e',
                fontSize: '12px',
                minWidth: 'auto',
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': {
                  color: '#005dac',
                  backgroundColor: 'transparent',
                },
              }}
            >
              {item}
            </Button>
          ))}
        </Box>
      </StyledFooter>
    </>
  );
}
