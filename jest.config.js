module.exports = {
    setupFiles: [
        'dotenv/config',
    ],
	setupFilesAfterEnv: [
		'./src/test/setup.ts',
	]
}
