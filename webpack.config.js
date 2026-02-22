const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const dotenv = require("dotenv");

// قراءة .env.local
dotenv.config({ path: ".env.local" });

module.exports = {
  entry: "./src/main.ts",

  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },

  resolve: {
    extensions: [".ts", ".js"],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./index.html",
    }),

    // 👇 حقن متغير البيئة
    new webpack.DefinePlugin({
      "process.env.GEMINI_API_KEY": JSON.stringify(
        process.env.GEMINI_API_KEY
      ),
    }),
  ],

  devServer: {
    static: "./dist",
    port: 3000,
    open: true,
  },
};
