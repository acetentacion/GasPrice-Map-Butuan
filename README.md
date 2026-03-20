# FuelFinder PH - Community Gas Map

A community-driven gas price tracking application for Butuan City, Philippines.

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

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login user

### Price Management
- `POST /api/prices` - Submit new prices
- `GET /api/prices` - Get all price submissions
- `POST /api/vote` - Vote on price submissions (confirm/dispute)

### Admin Functions
- `POST /api/flag-price` - Flag price as fake
- `POST /api/remove-price` - Remove price submission
- `POST /api/approve-price` - Approve pending submission
- `POST /api/reject-price` - Reject pending submission

### User Management
- `GET /api/user-score` - Get user score and admin status
- `GET /api/user-submissions` - Get user's price submissions

### Rankings
- `GET /api/user-rankings` - Get user rankings
- `GET /api/station-rankings` - Get station rankings by fuel type

## Configuration

### Frontend Configuration

The frontend uses a `config.js` file to manage API endpoints:

```javascript
const config = {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000'
};
```

For production deployment:
- Set `API_BASE_URL` environment variable in Netlify
- Or it will default to the deployed site URL

### Database Schema

The application uses three main collections:

1. **Prices**: Stores fuel price submissions
2. **Users**: Stores user accounts and scores
3. **Stations**: Stores gas station information

## Troubleshooting

### Mobile Tap Issues
If markers still don't respond to taps:
- Ensure `touchend` events are being used (not `touchstart`)
- Check that no other touch event listeners are interfering
- Verify the CSS `touch-action: manipulation` is applied to markers

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