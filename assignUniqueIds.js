// File: assignUniqueIds.js

const mongoose = require('mongoose');
const Alumni = require('./models/Alumni.js').default; // Use .default if models export with 'export default'
const Teacher = require('./models/Teacher.js').default; // Use .default if models export with 'export default'
// ... rest of the code

// ⚠️ YOUR SPECIFIC MONGODB CONNECTION STRING
const MONGODB_URI = 'mongodb+srv://milan-dev:Milan123@cluster0.0stui7v.mongodb.net/alumniDB?retryWrites=true&w=majority&appName=Cluster0'; 

// --- HELPER FUNCTION: Finds the highest numerical ID across both collections ---
const getHighestNumericalID = async () => {
    // Search both collections for the highest existing numerical ID part
    const alumniCodeQuery = await Alumni
        .findOne({ alumniCode: { $ne: null, $ne: '' } })
        .sort({ alumniCode: -1 })
        .select('alumniCode')
        .exec();

    const teacherCodeQuery = await Teacher
        .findOne({ teacherCode: { $ne: null, $ne: '' } })
        .sort({ teacherCode: -1 })
        .select('teacherCode')
        .exec();

    let highestNumber = 999; // IDs start at 1000 for new users

    const extractNumber = (code) => {
        // Regex to extract the 4-digit number between 'MCA' and the suffix letter (A/F)
        const match = code ? code.match(/^MCA(\d{4})[AF]$/) : null;
        return match && match[1] ? parseInt(match[1], 10) : 0;
    };

    const alumniNumber = extractNumber(alumniCodeQuery?.alumniCode);
    const teacherNumber = extractNumber(teacherCodeQuery?.teacherCode);

    // Get the absolute highest number across both user types
    highestNumber = Math.max(highestNumber, alumniNumber, teacherNumber);

    return highestNumber;
};


// --- MAIN MIGRATION FUNCTION ---
const assignCodesToExistingUsers = async () => {
    console.log('Starting unique ID assignment for existing users...');

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Database connected successfully.');

        // Get the current highest ID number used by any user (new or old format)
        let currentHighestNumber = await getHighestNumericalID();

        // ----------------------------------------------------
        // 1. PROCESS ALUMNI
        // ----------------------------------------------------
        // Find documents where 'alumniCode' field is missing or null
        const alumniToUpdate = await Alumni.find({ alumniCode: { $exists: false } });
        console.log(`Found ${alumniToUpdate.length} Alumni records without an existing code.`);

        for (const alumnus of alumniToUpdate) {
            currentHighestNumber++;
            const paddedNumber = String(currentHighestNumber).padStart(4, '0');
            const newCode = `MCA${paddedNumber}A`; // 'A' for Alumni
            
            alumnus.alumniCode = newCode;
            await alumnus.save({ validateBeforeSave: false }); // Skip full validation for old records
            console.log(`Assigned Alumni ID: ${newCode} to ${alumnus.email}`);
        }

        // ----------------------------------------------------
        // 2. PROCESS TEACHERS/FACULTY
        // ----------------------------------------------------
        // Find documents where 'teacherCode' field is missing or null
        const teachersToUpdate = await Teacher.find({ teacherCode: { $exists: false } });
        console.log(`Found ${teachersToUpdate.length} Teacher records without an existing code.`);

        for (const teacher of teachersToUpdate) {
            currentHighestNumber++;
            const paddedNumber = String(currentHighestNumber).padStart(4, '0');
            const newCode = `MCA${paddedNumber}F`; // 'F' for Faculty
            
            teacher.teacherCode = newCode;
            await teacher.save({ validateBeforeSave: false });
            console.log(`Assigned Teacher ID: ${newCode} to ${teacher.email}`);
        }

        console.log('Migration complete. All users without codes have been assigned unique IDs.');
        
    } catch (error) {
        console.error('Migration failed:', error);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('Database connection closed.');
    }
};

assignCodesToExistingUsers();