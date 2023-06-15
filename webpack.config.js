'use strict';

const path = require('path');
const webpack = require('webpack');
const Uglify = require("uglifyjs-webpack-plugin");
const HappyPack = require('happypack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const happyThreadPool = HappyPack.ThreadPool({ size: 5 });
const CleanWebpackPlugin = require('clean-webpack-plugin');

const generateConfig = (options= {}) => {
  const getOption = value => {
    if (value in options) {
      return options[value];
    } else {
      return process.env[value];
    }
  };
  const isDev = getOption('NODE_ENV') === 'development';
  const OUTPUT_DIRECTORY = path.resolve('bundle');

  const PLUGINS = [
    new CleanWebpackPlugin(OUTPUT_DIRECTORY, { root: path.resolve(__dirname, '../') }),
    // re-enable type checking
    new ForkTsCheckerWebpackPlugin(),
    new HappyPack({
      id: 'ts',
      threadPool: happyThreadPool,
      loaders: [
        {
          loader: 'ts-loader',
          options: {
            happyPackMode: true,
            transpileOnly: true,
            compilerOptions: {
              module: 'es2015',
              target: 'es2015',
            }
          }
        }
      ]
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(getOption('NODE_ENV')),
        FRONTEND_DSN: JSON.stringify(getOption('FRONTEND_DSN')),
        SENTRY_RELEASE_VERSION: JSON.stringify(getOption('SENTRY_RELEASE_VERSION')),
        CIRCLE_BUILD_NUM: JSON.stringify(getOption('CIRCLE_BUILD_NUM')),
        BUILD_NUMBER: JSON.stringify(getOption('BUILD_NUMBER')),
        LOCALE: JSON.stringify('en-US'),
        ENABLE_PORTAL: JSON.stringify(getOption('ENABLE_PORTAL')),
        PUSHER_APP_KEY: JSON.stringify(getOption('PUSHER_APP_KEY')),
        PUSHER_ENV: JSON.stringify(getOption('PUSHER_ENV')),
      }
    }),
  ];

  const DEV_PLUGINS = [
    new webpack.HotModuleReplacementPlugin(),
    ...PLUGINS,
  ];

  const PROD_PLUGINS = [
    ...PLUGINS,
  ];

  const STYLE_LOADER_CONFIG = [
    {
      loader: 'css-loader',
      query: {
        modules: true,
        importLoaders: 1,
        localIdentName: '[name]__[local]___[hash:base64:5]'
      }
    },
    'postcss-loader',
  ];

  const STYLE_LOADER_CONFIG_GLOBAL = [
    {
      loader: 'css-loader',
      query: {
        modules: true,
        importLoaders: 1,
        localIdentName: '[local]',
      }
    },
    'postcss-loader',
  ];

  const STYLE_LOADER = {
    test: /\.css$/
  };

  const STYLE_LOADER_GLOBAL = {
    test: /global\.css$/
  };

  const DEV_STYLE_LOADER = {
    oneOf: [
      Object.assign({}, STYLE_LOADER_GLOBAL, { use: [ 'style-loader', ...STYLE_LOADER_CONFIG_GLOBAL ] }),
      Object.assign({}, STYLE_LOADER, {
        use: [ 'style-loader', ...STYLE_LOADER_CONFIG ]
      })
    ]
  };

  const generateFileName = () => `[name]`;

  let plugins;
  let styleLoader;
  let mainEntry = [path.resolve('src/adminPortal.tsx')];
  let sassLoader = {
    test: /.scss$/
  };

  if (!isDev) {
    plugins = PROD_PLUGINS;
    styleLoader = DEV_STYLE_LOADER;
    Object.assign(sassLoader, {
      use: ['style-loader', 'css-loader', 'sass-loader']
    });
  } else {
    mainEntry = ['react-hot-loader/patch', 'webpack-hot-middleware/client', ...mainEntry];
    plugins = DEV_PLUGINS;
    styleLoader = DEV_STYLE_LOADER;
    Object.assign(sassLoader, {
      use: ['style-loader', 'css-loader', 'sass-loader']
    });
  }

  let entry = {
    adminPortal: mainEntry,
  }

  return {
    // disable sourcemaps
    devtool: false,
    bail: true,
    cache: true,
    entry,
    output: {
      path: OUTPUT_DIRECTORY,
      publicPath: '/static/',
      filename: generateFileName() + '.js',
      sourceMapFilename: '[file].map'
    },
    module: {
      rules: [
        {
          test: /\.ts(x?)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'happypack/loader?id=ts'
            }
          ]
        },
        styleLoader,
        sassLoader,
        {
          test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          loader: 'url-loader?limit=10000&mimetype=application/font-woff'
        }, {
          test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          loader: 'file-loader'
        }, {
          test: /\.(jpg|png)$/,
          loader: 'file-loader?name=[path][name].[hash].[ext]'
        }
      ]
    },
    plugins,
    resolve: {
      alias: {
        react: path.resolve(__dirname, '../', '../', 'node_modules', 'react'),
        "react-dom": path.resolve(__dirname, '../', '../', 'node_modules', 'react-dom'),
      },
      extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.js', '.css']
    }
  };
};

let config = generateConfig(process.env);
module.exports = config;
