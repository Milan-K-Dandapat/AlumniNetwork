import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Using process.env.MONGO_URI as specified in your file.
    // Ensure your environment is configured to load the .env file 
    // where MONGO_URI is set to: 
    // mongodb+srv://milan-dev:Milan123@cluster0.0stui7v.mongodb.net/alumniDB?retryWrites=true&w=majority&appName=Cluster0
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

export default connectDB;
