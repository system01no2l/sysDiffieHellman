const { isHasValue, powMod, randomBigInt } = require('./helper');
const Constants = Object.freeze({
    DEFAULT_KEY_SIZE: 2048,
    // Key formats
    FORMAT_BINARY: 'binary',
    FORMAT_NUMBER: 'number',
});

class Client {
    constructor() {
        /**
         * Default large prime number; required by the algorithm.
         *
         * @type {string|null}
         */
        this.prime = null;

        /**
         * The default generator number. This number must be greater than 0 but
         * less than the prime number set.
         *
         * @type {string|null}
         */
        this.generator = null;

        /**
         * A private number set by the local user. It's optional and will
         * be generated if not set.
         *
         * @type {string|null}
         */
        this.privateKey = null;

        /**
         * The public key generated by this instance after calling generateKeys().
         *
         * @type {string|null}
         */
        this.publicKey = null;

        /**
         * The shared secret key resulting from a completed Diffie Hellman
         * exchange
         *
         * @type {string|null}
         */
        this.secretKey = null;
    }

    /**
     * Generate own public key. If a private number has not already been set,
     * one will be generated at this stage.
     *
     * @returns {DiffieHellman} Provides a fluent interface
     */
    generateKeys() {
        const privateKey = powMod(this.getGenerator(), this.getPrivateKey(), this.getPrime()).toString();
        this.setPublicKey(privateKey);
        return this;
    }

    /**
     * Setter for the value of the public number
     *
     * @param {string} number
     * @param {string} format
     * @returns {DiffieHellman} Provides a fluent interface
     */
    setPublicKey(number, format = Constants.FORMAT_NUMBER) {
        number = this.convert(number, format, Constants.FORMAT_NUMBER);
        if (!number.match(/^\d+$/)) {
            throw new TypeError('Invalid parameter; not a positive natural number');
        }
        this.publicKey = String(number);
        return this;
    }

    /**
     * Returns own public key for communication to the second party to this transaction
     *
     * @param {string} format
     * @returns {string}
     */
    getPublicKey(format = Constants.FORMAT_NUMBER) {
        if (this.publicKey == null) {
            throw new Error(
                'A public key has not yet been generated using a prior call to generateKeys()'
            );
        }
        return this.convert(this.publicKey, Constants.FORMAT_NUMBER, format);
    }

    /**
     * Compute the shared secret key based on the public key received from the
     * the second party to this transaction. This should agree to the secret
     * key the second party computes on our own public key.
     * Once in agreement, the key is known to only to both parties.
     * By default, the function expects the public key to be in binary form
     * which is the typical format when being transmitted.
     *
     * If you need the binary form of the shared secret key, call
     * getSharedSecretKey() with the optional parameter for Binary output.
     *
     * @param {string} publicKey
     * @param {string} publicKeyFormat
     * @param {string} secretKeyFormat
     * @returns {string}
     */
    computeSecretKey(
        publicKey,
        publicKeyFormat = Constants.FORMAT_NUMBER,
        secretKeyFormat = Constants.FORMAT_NUMBER
    ) {
        publicKey = this.convert(publicKey, publicKeyFormat, Constants.FORMAT_NUMBER);
        if (!publicKey.match(/^\d+$/)) {
            throw new TypeError(
                'Invalid parameter; not a positive natural number'
            );
        }
        this.secretKey = powMod(publicKey, this.getPrivateKey(), this.getPrime()).toString();
        return this.getSharedSecretKey(secretKeyFormat);
    }

    /**
     * Return the computed shared secret key from the DiffieHellman transaction
     *
     * @param {string} format
     * @returns {string}
     */
    getSharedSecretKey(format = Constants.FORMAT_NUMBER) {
        if (!isHasValue(this.secretKey)) {
            throw new Error(
                'A secret key has not yet been computed; call computeSecretKey() first'
            );
        }
        return this.convert(this.secretKey, Constants.FORMAT_NUMBER, format);
    }

    /**
     * Setter for the value of the prime number
     *
     * @param {string} number
     * @returns {DiffieHellman} Provides a fluent interface
     */
    setPrime(number) {
        if (!number || !number.match(/^\d+$/) || number < 11) {
            throw new TypeError(
                'Invalid parameter; not a positive natural number or too small: should be a large natural number prime'
            );
        }
        this.prime = String(number);
        return this;
    }

    /**
     * Getter for the value of the prime number
     *
     * @param {string} format
     * @returns {string}
     */
    getPrime(format = Constants.FORMAT_NUMBER) {
        if (!isHasValue(this.prime)) {
            throw new Error('No prime number has been set');
        }
        return this.convert(this.prime, Constants.FORMAT_NUMBER, format);
    }

    /**
     * Setter for the value of the generator number
     *
     * @param {string} number
     * @returns {DiffieHellman} Provides a fluent interface
     */
    setGenerator(number) {
        if (!number.match(/^\d+$/) || number < 2) {
            throw new TypeError(
                'Invalid parameter; not a positive natural number greater than 1'
            );
        }
        this.generator = String(number);
        return this;
    }

    /**
     * Getter for the value of the generator number
     *
     * @param {string} format
     * @returns {string}
     */
    getGenerator(format = Constants.FORMAT_NUMBER) {
        if (!isHasValue(this.generator)) {
            throw new Error('No generator number has been set');
        }
        return this.convert(this.generator, Constants.FORMAT_NUMBER, format);
    }

    /**
     * Setter for the value of the private number
     *
     * @param {string} number
     * @param {string} format
     * @returns {DiffieHellman} Provides a fluent interface
     */
    setPrivateKey(number, format = Constants.FORMAT_NUMBER) {
        number = this.convert(number, format, Constants.FORMAT_NUMBER);
        if (!number.match(/^\d+$/)) {
            throw new TypeError('Invalid parameter; not a positive natural number');
        }
        this.privateKey = String(number);
        return this;
    }

    /**
     * Getter for the value of the private number
     *
     * @param {string} format
     * @returns {string}
     */
    getPrivateKey(format = Constants.FORMAT_NUMBER) {
        if (!this.hasPrivateKey()) {
            this.setPrivateKey(this.generatePrivateKey());
        }
        return this.convert(this.privateKey, Constants.FORMAT_NUMBER, format);
    }

    /**
     * Check whether a private key currently exists.
     *
     * @returns {boolean}
     */
    hasPrivateKey() {
        return isHasValue(this.privateKey);
    }

    /**
     * Convert number between formats
     *
     * @param {string} number
     * @param {string} inputFormat
     * @param {string} outputFormat
     * @returns {string}
     */
    convert(number, inputFormat = Constants.FORMAT_NUMBER, outputFormat = Constants.FORMAT_BINARY) {

        if (inputFormat === outputFormat) {
            return BigInt(number).toString();
        }

        // convert to number
        switch (inputFormat) {
            case Constants.FORMAT_BINARY:
                number = BigInt(parseInt(number, 2));
                break;
            case Constants.FORMAT_NUMBER:
            default:
                // do nothing
                break;
        }

        // convert to output format
        switch (outputFormat) {
            case Constants.FORMAT_BINARY:
                return BigInt(number).toString(2);
            case Constants.FORMAT_NUMBER:
            default:
                return number.toString();
        }
    }

    /**
     * In the event a private number/key has not been set by the user,
     * or generated by ext/openssl, a best attempt will be made to
     * generate a random key. Having a random number generator installed
     * on linux/bsd is highly recommended! The alternative is not recommended
     * for production unless without any other option.
     *
     * @returns {string}
     */
    generatePrivateKey(){
        // todo use native random_bytes to generate binary private key
        return randomBigInt(this.prime.length).toString();
    }
}

module.exports = Client;