import bcrypt from 'bcryptjs';

// HASH PASSWORD
export const hashPassword = async (password) => {

    const salt = await bcrypt.genSalt(10);

    return await bcrypt.hash(password, salt);

};

// COMPARE PASSWORD
export const comparePassword = async (
    enteredPassword,
    hashedPassword
) => {

    return await bcrypt.compare(
        enteredPassword,
        hashedPassword
    );

};