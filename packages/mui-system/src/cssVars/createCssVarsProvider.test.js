import * as React from 'react';
import { expect } from 'chai';
import { spy } from 'sinon';
import { createRenderer, screen, fireEvent } from 'test/utils';
import createCssVarsProvider from './createCssVarsProvider';
import { DEFAULT_ATTRIBUTE, DEFAULT_MODE_STORAGE_KEY } from './getInitColorSchemeScript';
import useTheme from '../useTheme';

describe('createCssVarsProvider', () => {
  const { render } = createRenderer();
  let originalMatchmedia;
  let storage = {};
  const createMatchMedia = (matches) => () => ({
    matches,
    addListener: () => {},
    removeListener: () => {},
  });

  beforeEach(() => {
    originalMatchmedia = window.matchMedia;

    // Create mocks of localStorage getItem and setItem functions
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: spy((key) => storage[key]),
        setItem: spy((key, value) => {
          storage[key] = value;
        }),
      },
      configurable: true,
    });

    // clear the localstorage
    storage = {};
    window.matchMedia = createMatchMedia(false);
  });
  afterEach(() => {
    window.matchMedia = originalMatchmedia;
  });

  describe('[Design System] CssVarsProvider', () => {
    it('display error if `defaultColorScheme` does not exist in theme.colorSchemes', () => {
      expect(() =>
        createCssVarsProvider({
          theme: {},
          defaultColorScheme: 'light',
        }),
      ).toErrorDev('MUI: `light` does not exist in `theme.colorSchemes`.');
    });

    it('has specified default colorScheme', () => {
      const { CssVarsProvider, useColorScheme } = createCssVarsProvider({
        theme: {
          colorSchemes: { light: {} },
        },
        defaultColorScheme: 'light',
      });
      const Consumer = () => {
        const { colorScheme } = useColorScheme();
        return <div data-testid="current-color-scheme">{colorScheme}</div>;
      };
      render(
        <CssVarsProvider>
          <Consumer />
        </CssVarsProvider>,
      );

      expect(screen.getByTestId('current-color-scheme').textContent).to.equal('light');
    });

    it('has css variable prefix', () => {
      const { CssVarsProvider } = createCssVarsProvider({
        theme: {
          colorSchemes: { light: { fontSize: 16 } },
        },
        defaultColorScheme: 'light',
        prefix: 'mui',
      });
      const Text = () => {
        const theme = useTheme();
        return <div data-testid={`text`}>{theme.vars.fontSize}</div>;
      };
      render(
        <CssVarsProvider>
          <Text />
        </CssVarsProvider>,
      );

      expect(screen.getByTestId('text').textContent).to.equal('var(--mui-fontSize)');
    });

    it('can access to allColorSchemes', () => {
      const { CssVarsProvider, useColorScheme } = createCssVarsProvider({
        theme: {
          colorSchemes: {
            light: {},
            dark: {},
          },
        },
        defaultColorScheme: 'light',
      });
      const Consumer = () => {
        const { allColorSchemes } = useColorScheme();
        return <div data-testid="all-colorSchemes">{allColorSchemes.join(',')}</div>;
      };
      const { rerender } = render(
        <CssVarsProvider>
          <Consumer />
        </CssVarsProvider>,
      );

      expect(screen.getByTestId('all-colorSchemes').textContent).to.equal('light,dark');

      rerender(
        <CssVarsProvider theme={{ colorSchemes: { comfort: { palette: { color: '#e5e5e5' } } } }}>
          <Consumer />
        </CssVarsProvider>,
      );

      expect(screen.getByTestId('all-colorSchemes').textContent).to.equal('light,dark,comfort');
    });

    it('can set new colorScheme', () => {
      const { CssVarsProvider, useColorScheme } = createCssVarsProvider({
        theme: {
          colorSchemes: { light: {}, dark: {} },
        },
        defaultColorScheme: 'light',
      });
      const Consumer = () => {
        const { colorScheme, setColorScheme } = useColorScheme();
        return (
          <div>
            <div data-testid="current-color-scheme">{colorScheme}</div>
            <button onClick={() => setColorScheme('dark')}>change to dark</button>
          </div>
        );
      };
      render(
        <CssVarsProvider>
          <Consumer />
        </CssVarsProvider>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'change to dark' }));

      expect(screen.getByTestId('current-color-scheme').textContent).to.equal('dark');
      expect(document.body.getAttribute('data-mui-color-scheme')).to.equal('dark');
    });

    it('display error if non-existed colorScheme is set', () => {
      const { CssVarsProvider, useColorScheme } = createCssVarsProvider({
        theme: {
          colorSchemes: { light: {} },
        },
        defaultColorScheme: 'light',
      });
      const Consumer = () => {
        const { setColorScheme } = useColorScheme();
        return <button onClick={() => setColorScheme('foo')}>change to dark</button>;
      };

      render(
        <CssVarsProvider>
          <Consumer />
        </CssVarsProvider>,
      );

      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: 'change to dark' })),
      ).toErrorDev('`foo` does not exist in `theme.colorSchemes`.');
    });

    it('does not create css var if shouldSkipGeneratingVar return true', () => {
      const { CssVarsProvider } = createCssVarsProvider({
        theme: {
          colorSchemes: {
            light: {
              typography: {
                htmlFontSize: '16px',
                h1: {
                  fontSize: '1rem',
                  fontWeight: 500,
                },
              },
            },
          },
        },
        defaultColorScheme: 'light',
        shouldSkipGeneratingVar: (keys) => keys[0] === 'typography' && keys[1] === 'h1',
      });
      const Consumer = () => {
        const theme = useTheme();
        return <div data-testid="h1">{theme.vars.typography.h1 || ''}</div>;
      };
      expect(() =>
        render(
          <CssVarsProvider>
            <Consumer />
          </CssVarsProvider>,
        ),
      ).not.toErrorDev(); // if `h1` is skipped, there will be no error.
    });
  });

  describe('DOM', () => {
    it('attach default dataset on body', () => {
      const { CssVarsProvider } = createCssVarsProvider({
        theme: {
          colorSchemes: { light: {} },
        },
        defaultColorScheme: 'light',
      });
      render(<CssVarsProvider />);

      expect(document.body.getAttribute(DEFAULT_ATTRIBUTE)).to.equal('light');
    });

    it('use custom attribute', () => {
      const { CssVarsProvider } = createCssVarsProvider({
        theme: {
          colorSchemes: { light: {} },
        },
        defaultColorScheme: 'light',
      });
      const customAttribute = 'data-foo-bar';

      render(<CssVarsProvider attribute={customAttribute} />);

      expect(document.body.getAttribute('data-foo-bar')).to.equal('light');
    });
  });

  describe('Storage', () => {
    const { CssVarsProvider, useColorScheme } = createCssVarsProvider({
      theme: {
        colorSchemes: { light: {}, dark: {} },
      },
      defaultColorScheme: 'light',
    });
    const Consumer = () => {
      const { mode, setMode } = useColorScheme();
      return (
        <div>
          <div data-testid="current-mode">{mode}</div>
          <button onClick={() => setMode('dark')}>change to dark</button>
        </div>
      );
    };
    it('should save mode to localStorage', () => {
      render(
        <CssVarsProvider>
          <Consumer />
        </CssVarsProvider>,
      );

      expect(global.localStorage.setItem.calledWith(DEFAULT_MODE_STORAGE_KEY, 'light')).to.equal(
        true,
      );

      fireEvent.click(screen.getByRole('button', { name: 'change to dark' }));

      expect(global.localStorage.setItem.calledWith(DEFAULT_MODE_STORAGE_KEY, 'dark')).to.equal(
        true,
      );
    });

    it('should use mode from localStorage if exists', () => {
      storage[DEFAULT_MODE_STORAGE_KEY] = 'dark';

      render(
        <CssVarsProvider>
          <Consumer />
        </CssVarsProvider>,
      );

      expect(screen.getByTestId('current-mode').textContent).to.equal('dark');
    });

    it('use custom modeStorageKey', () => {
      const customModeStorageKey = 'foo-mode';
      storage[customModeStorageKey] = 'dark';

      render(
        <CssVarsProvider modeStorageKey={customModeStorageKey}>
          <Consumer />
        </CssVarsProvider>,
      );

      expect(screen.getByTestId('current-mode').textContent).to.equal('dark');
      expect(global.localStorage.setItem.calledWith(customModeStorageKey, 'dark')).to.equal(true);
    });
  });

  /**
   * This can occur if two application use default storage key
   * App I: supported color scheme ['light', 'dark', 'purple']
   * App II: supported color scheme ['light', 'dark', 'orange']
   *
   * If you are one App I with color scheme 'purple', when open App II it should fallback
   * to default color scheme of App II because App II does not support 'purple'
   */
  describe('Unsupported color scheme', () => {
    const { CssVarsProvider } = createCssVarsProvider({
      theme: {
        colorSchemes: {
          light: {
            color: 'light',
          },
          dark: {
            color: 'dark',
          },
        },
      },
      defaultColorScheme: 'light',
    });
    const Color = () => {
      const theme = useTheme();
      return <div data-testid="color">{theme.vars.color}</div>;
    };
    it('use default color scheme if the storage value does not exist', () => {
      storage[DEFAULT_MODE_STORAGE_KEY] = 'unknown';

      render(
        <CssVarsProvider>
          <Color />
        </CssVarsProvider>,
      );

      expect(screen.getByTestId('color').textContent).to.equal('var(--color)');
    });
  });

  describe('[Application] Customization', () => {
    it('merge custom theme', () => {
      const { CssVarsProvider } = createCssVarsProvider({
        theme: {
          fontSize: { md: '1rem', sm: null },
          colorSchemes: {
            light: {},
          },
        },
        defaultColorScheme: 'light',
      });
      const Text = ({ scale = 'md' }) => {
        const theme = useTheme();
        return <div data-testid={`text-${scale}`}>{theme.vars.fontSize[scale]}</div>;
      };
      render(
        <CssVarsProvider theme={{ fontSize: { sm: '0.75rem' } }}>
          <Text scale="md" />
          <Text scale="sm" />
        </CssVarsProvider>,
      );

      expect(screen.getByTestId('text-md').textContent).to.equal('var(--fontSize-md)');
      expect(screen.getByTestId('text-sm').textContent).to.equal('var(--fontSize-sm)');
    });

    it('merge custom colorSchemes', () => {
      const { CssVarsProvider } = createCssVarsProvider({
        theme: {
          colorSchemes: {
            light: {
              palette: {
                color: '#000000',
              },
            },
          },
        },
        defaultColorScheme: 'light',
      });
      const Swatch = () => {
        const theme = useTheme();
        return (
          <div>
            <div data-testid="swatch-color">{theme.vars.palette.color}</div>
            <div data-testid="swatch-color-value">{theme.palette.color}</div>
          </div>
        );
      };
      const comfortColor = '#007FFF';
      render(
        <CssVarsProvider
          defaultColorScheme="comfort"
          theme={{
            colorSchemes: {
              comfort: {
                palette: {
                  color: comfortColor,
                },
              },
            },
          }}
        >
          <Swatch />
        </CssVarsProvider>,
      );

      expect(screen.getByTestId('swatch-color').textContent).to.equal('var(--palette-color)');
      expect(screen.getByTestId('swatch-color-value').textContent).to.equal(comfortColor);
    });

    it('extend palette property in colorSchemes', () => {
      const { CssVarsProvider } = createCssVarsProvider({
        theme: {
          colorSchemes: {
            light: {
              palette: {
                color: '#000000',
              },
            },
          },
        },
        defaultColorScheme: 'light',
      });
      const Swatch = () => {
        const theme = useTheme();
        return (
          <div>
            <div data-testid="swatch-color">{theme.vars.palette.color}</div>
            <div data-testid="swatch-bgcolor">{theme.vars.palette.bgcolor}</div>
          </div>
        );
      };
      render(
        <CssVarsProvider theme={{ colorSchemes: { light: { palette: { bgcolor: '#ffffff' } } } }}>
          <Swatch />
        </CssVarsProvider>,
      );

      expect(screen.getByTestId('swatch-color').textContent).to.equal('var(--palette-color)');
      expect(screen.getByTestId('swatch-bgcolor').textContent).to.equal('var(--palette-bgcolor)');
    });

    it('able to override css variable prefix', () => {
      const { CssVarsProvider } = createCssVarsProvider({
        theme: {
          colorSchemes: { light: { fontSize: 16 } },
        },
        defaultColorScheme: 'light',
        prefix: 'mui',
      });
      const Text = () => {
        const theme = useTheme();
        return <div data-testid={`text`}>{theme.vars.fontSize}</div>;
      };
      render(
        <CssVarsProvider prefix="foo-bar">
          <Text />
        </CssVarsProvider>,
      );

      expect(screen.getByTestId('text').textContent).to.equal('var(--foo-bar-fontSize)');
    });

    it('`defaultMode` is specified', () => {
      const { CssVarsProvider, useColorScheme } = createCssVarsProvider({
        theme: {
          colorSchemes: { light: {}, dark: {} },
        },
        defaultColorScheme: 'light',
      });
      const Text = () => {
        const { mode } = useColorScheme();
        return <div>{mode}</div>;
      };
      const { container } = render(
        <CssVarsProvider defaultMode="dark">
          <Text />
        </CssVarsProvider>,
      );
      expect(container.firstChild.textContent).to.equal('dark');
    });

    it('`defaultColorScheme` is specified as string', () => {
      const { CssVarsProvider, useColorScheme } = createCssVarsProvider({
        theme: {
          colorSchemes: { light: {} },
        },
        defaultColorScheme: 'light',
      });
      const Text = () => {
        const { colorScheme } = useColorScheme();
        return <div>{colorScheme}</div>;
      };
      const { container } = render(
        <CssVarsProvider theme={{ colorSchemes: { paper: {} } }} defaultColorScheme="paper">
          <Text />
        </CssVarsProvider>,
      );
      expect(container.firstChild.textContent).to.equal('paper');
    });

    it('`defaultColorScheme` is specified as object', () => {
      const { CssVarsProvider, useColorScheme } = createCssVarsProvider({
        theme: {
          colorSchemes: { light: {} },
        },
        defaultColorScheme: 'light',
      });
      const Text = () => {
        const { colorScheme } = useColorScheme();
        return <div>{colorScheme}</div>;
      };
      const { container } = render(
        <CssVarsProvider
          theme={{ colorSchemes: { paper: {} } }}
          defaultColorScheme={{ light: 'paper' }}
        >
          <Text />
        </CssVarsProvider>,
      );
      expect(container.firstChild.textContent).to.equal('paper');
    });
  });
});
