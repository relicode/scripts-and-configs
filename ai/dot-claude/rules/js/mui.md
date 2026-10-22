---
paths:
  - "**/*.{tsx,jsx}"
---

# MUI

- Look up components in the docs for the installed major version, through `mui-mcp`, rather than from memory: their props change between majors. In v9, style props such as `alignItems` on `Stack` go in `sx`.
- Import components and icons by path (`import Button from '@mui/material/Button'`), not from a package's barrel, which slows development builds, above all for icons.
- Use MUI's component where it has one (`Box`, `Typography`, `Button`, `Link`) rather than a raw HTML element, so the theme, `sx` and the color scheme reach it. Raw elements stay where MUI has no counterpart, such as `<audio>` or a file `<input>`, and where a hot path can't afford the wrapper.
- Read colors from the theme: as tokens in `sx` (`color: 'text.secondary'`, `bgcolor: 'background.paper'`) or through `theme.vars`. With CSS theme variables on, `theme.palette` holds the default scheme's values, so code reading it paints light colors in dark mode. Style dark mode with `theme.applyStyles('dark', …)`, not by checking `theme.palette.mode`.
- Space siblings with their container's gap (`<Stack sx={{ gap: 2 }}>`), not with margins on the children. `Stack`'s `spacing` sets child margins unless `useFlexGap` is on.
- A component that wraps an MUI component takes that component's props, `sx` included, and puts the caller's `sx` after its own in the array form, `sx={[ownSx, ...(Array.isArray(sx) ? sx : [sx])]}`, or with the project's helper for it. Spreading the two as objects drops a callback `sx` and turns an array's indices into CSS properties. A component with no single root takes `slotProps` for each part instead.
