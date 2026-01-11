const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  return {
    mode: argv.mode || 'development',
    devtool: isDevelopment ? 'inline-source-map' : false,
    
    entry: {
      background: './src/background/background.js',
      content: './src/content/content.js',
      popup: './src/popup/popup.js',
      settings: './src/settings/settings.js',
    },
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'manifest.json', to: 'manifest.json' },
          { from: 'assets', to: 'assets' },
          { from: 'src/content/banner.css', to: 'banner.css' },
          { from: 'src/settings/settings.html', to: 'settings.html' },
        ],
      }),
      
      new HtmlWebpackPlugin({
        template: './src/popup/popup.html',
        filename: 'popup.html',
        chunks: ['popup'],
        inject: 'body',
        minify: false,
      }),
    ],
    
    optimization: {
      minimize: !isDevelopment,
    },
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@config': path.resolve(__dirname, 'config'),
      },
    },
  };
};
