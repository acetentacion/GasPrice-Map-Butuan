# FuelFinder PH - Community Gas Map

A community-driven gas price tracking application for Butuan City, Philippines.

## Demo: https://gasfinderbxu.netlify.app/

## Features

- **Real-time Gas Prices**: Community-submitted fuel prices for Diesel, Unleaded 91, and Unleaded 95
- **Interactive Map**: View gas stations on an interactive map with price information
- **User Rankings**: Track user contributions and trust scores
- **Price History**: View historical price data for stations
- **Mobile-Optimized**: Fully responsive design that works great on mobile devices
- **Admin Controls**: Admin tools for managing submissions and user accounts

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript (ES6 Modules), Tailwind CSS, Leaflet.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Authentication**: bcrypt for password hashing
- **Deployment**: Netlify (Frontend) + Node.js server

## Installation & Setup

### Prerequisites

- Node.js (version 18+)
- MongoDB Atlas account
- Netlify account (for deployment)

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd GasPrice-Map-Butuan
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```
   PORT=3000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gasprice?retryWrites=true&w=majority
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** and navigate to `http://localhost:3000`

### Production Deployment to Netlify

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Production deployment setup"
   git push origin production
   ```

2. **Connect to Netlify**:
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository
   - Select the `production` branch
   - Set build command: `npm start`
   - Set publish directory: `.` (root)
   - Deploy site

3. **Environment Variables**:
   - In Netlify dashboard, go to Site settings > Build & deploy > Environment
   - Add your MongoDB connection string as `MONGODB_URI`
   - The `PORT` will be automatically set by Netlify

### CORS Issues
The server includes CORS middleware, but if you encounter CORS errors:
- Ensure the frontend and backend are on the same domain in production
- Check that the `API_BASE_URL` is correctly configured

### MongoDB Connection
- Verify your MongoDB Atlas connection string
- Ensure IP whitelisting is configured correctly
- Check that your database user has proper permissions

## Contributing

1. Create a feature branch from `production`
2. Make your changes
3. Test thoroughly on both desktop and mobile
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the console for error messages
- Ensure all dependencies are properly installed
