// TODO: merge configurations to shorten this file & the compilation time

// tslint:disable:object-literal-sort-keys
import { readdirSync } from 'fs';
import { resolve } from 'path';
import replace from 'rollup-plugin-replace';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';

const prod = process.env.NODE_ENV === 'production';

const inputs = readdirSync('src')
  .filter((file) => !file.endsWith('.d.ts'))
  .map((file) => file.slice(0, -3));

const iife = (input, minify) => ({
  input: `src/${input}.ts`,
  output: {
    file: `lib/${input}.iife${minify ? '.min' : ''}.js`,
    format: 'iife',
    name: `pi.${input[0].toUpperCase()}${input.slice(1).toLowerCase()}`,
    globals: {
      [resolve(__dirname, `src/pi.js`)]: 'pi.Pi',
      [resolve(__dirname, `src/stream.js`)]: 'pi.Stream',
    },
    sourcemap: !prod,
  },
  plugins: [
    typescript({
      tsconfigOverride: {
        compilerOptions: {
          declaration: prod,
          sourceMap: !prod,
        },
      },
    }),
    ...minify ? [
      terser({
        mangle: {
          properties: {
            regex: /^_/,
          },
        },
      }),
    ] : [],
    replace({
      'include': 'src/**/*.ts',
      'delimiters': ['', ''],
      'import fetch from \'node-fetch\';': '',
    }),
  ],
  // Make all dependencies external
  external: () => true,
});

const esm = (input, minify, node) => ({
  input: `src/${input}.ts`,
  output: {
    file: `lib/${input}${node ? '' : '.esm'}${minify ? '.min' : ''}.${node ? 'mjs' : 'js'}`,
    format: 'es',
    sourcemap: !prod,
  },
  plugins: [
    typescript({
      tsconfigOverride: {
        compilerOptions: {
          declaration: prod,
          sourceMap: !prod,
        },
      },
    }),
    ...minify ? [
      terser({
        mangle: {
          properties: {
            regex: /^_/,
          },
        },
      }),
    ] : [],
    ...node ? [] : [
      replace({
        'include': 'src/**/*.ts',
        'delimiters': ['', ''],
        'import fetch from \'node-fetch\';': '',
      }),
    ],
  ],
  // Make all dependencies external
  external: () => true,
});

const cjs = (input, minify) => ({
  input: `src/${input}.ts`,
  output: {
    file: `lib/${input}.cjs${minify ? '.min' : ''}.js`,
    format: 'cjs',
    sourcemap: !prod,
  },
  plugins: [
    typescript({
      tsconfigOverride: {
        compilerOptions: {
          declaration: prod,
          sourceMap: !prod,
        },
      },
    }),
    ...minify ? [
      terser({
        mangle: {
          properties: {
            regex: /^_/,
          },
        },
      }),
    ] : [],
  ],
  // Make all dependencies external
  external: () => true,
});

export default inputs.reduce((configs, input) =>
  [
    ...configs,
    iife(input, false),
    ...prod ? [
      iife(input, true),
      esm(input, false, false),
      esm(input, false, true),
      esm(input, true, false),
      esm(input, true, true),
      cjs(input, false),
      cjs(input, true),
    ] : [],
  ],
  [],
);
