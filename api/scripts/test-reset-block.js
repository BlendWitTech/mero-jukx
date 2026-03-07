const bcrypt = require('bcrypt');

async function test() {
    const currentPassword = 'Admin@123';
    const hashedOld = await bcrypt.hash(currentPassword, 10);

    console.log(`Simulating reset to same password: "${currentPassword}"`);
    console.log(`Old Hash: ${hashedOld}`);

    const matches = await bcrypt.compare(currentPassword, hashedOld);
    console.log(`bcrypt.compare(currentPassword, hashedOld) results in: ${matches}`);

    if (matches) {
        console.log("BLOCK: New password cannot be the same as current");
    } else {
        console.log("ALLOW: Password reset successful");
    }
}

test();
