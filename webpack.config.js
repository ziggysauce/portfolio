const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = (env) => {
  const isProduction = env == 'production';
  const cssExtract = new ExtractTextPlugin('styles.css');

  return {
    entry: './index.js',
    output: {
      path: path.join(__dirname, 'public'),
      filename: 'bundle.js'
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/, // checks for any files ending in .js or .jsx
          exclude: [/node_modules/], // doesn't include node modules
          loader: 'babel-loader', // uses babel as transpiler
        },
        {
          test: /\.s?css$/, // checks for any files ending in .css, .sass, or .scss
          use: cssExtract.extract({
            use: [
              {
                loader: 'css-loader',
                options: {
                  sourceMaps: true
                }
              }, 
              {
                loader: 'sass-loader',
                options: {
                  sourceMaps: true
                }
              },            
            ]
          })
        }
      ]
    },
    plugins: [
      cssExtract
    ],
    devtool: isProduction ? 'source-map' : 'inline-source-map',
    devServer: {
      contentBase: path.join(__dirname, 'public')
    }
  }
};