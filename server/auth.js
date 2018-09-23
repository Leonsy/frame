'use strict';
const Session = require('./models/session');
const User = require('./models/user');


const register = function (server, options) {

    server.auth.strategy('simple', 'basic', {
        validate: async function (request, sessionId, key, h) {

            const session = await Session.findByCredentials(sessionId, key);

            if (!session) {
                return { isValid: false };
            }

            session.updateLastActive();

            const user = await User.findById(session.userId);

            if (!user) {
                return { isValid: false };
            }

            if (!user.isActive) {
                return { isValid: false };
            }

            const roles = await user.hydrateRoles();
            const credentials = {
                scope: Object.keys(user.roles),
                roles,
                session,
                user
            };

            return { credentials, isValid: true };
        }
    });

    const validate = async function (decoded, request) {

        const session = await Session.findByCredentials(decoded.id, decoded.key);

        if (!session) {
            return { isValid: false };
        }

        session.updateLastActive();

        const user = await User.findById(session.userId);

        if (!user) {
            return { isValid: false };
        }

        if (!user.isActive) {
            return { isValid: false };
        }

        const roles = await user.hydrateRoles();
        const credentials = {
            scope: Object.keys(user.roles),
            roles,
            session,
            user
        };

        return { credentials, isValid: true };
    };

    server.auth.strategy('jwt', 'jwt',{ 
        key: process.env.JWT_SECRET,          // Never Share your secret key
        validate: validate,            // validate function defined above
        verifyOptions: { algorithms: [ 'HS256' ] } // pick a strong algorithm
    });

    server.auth.default('jwt');
};


module.exports = {
    name: 'auth',
    dependencies: [
        'hapi-auth-basic',
        'hapi-mongo-models',
        'hapi-auth-jwt2'
    ],
    register
};
