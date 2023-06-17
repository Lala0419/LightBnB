const { query } = require("express");
const properties = require("./json/properties.json");
const users = require("./json/users.json");
const pg = require("pg");
const Pool = pg.Pool;
const config = {
	user: "vagrant",
	password: "123",
	host: "localhost",
	database: "lightbnb",
};

const pool = new Pool(config);

pool.query(`SELECT title FROM properties LIMIT 10;`).then((response) => {
	//console.log(response);
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
	return pool
		.query(
			`
			SELECT * 
			FROM users
			WHERE email = $1`,
			[email]
		)
		.then((result) => {
			//console.log("result,row", result.rows);
			return result.rows[0];
		})
		.catch((err) => {
			console.log(err.message);
		});
};
/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
	return pool
		.query(
			`
			SELECT *
			FROM users
			WHERE id = $1`,
			[id]
		)
		.then((result) => {
			return result.rows[0];
		})
		.catch((err) => {
			console.log(err.message);
		});
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
	const values = [user.name, user.email, user.password];
	const queryString = `
	INSERT INTO users(name, email, password)
		VALUES($1, $2, $3)
		RETURNING *;
	`;
	return pool.query(queryString, values).then((result) => {
		return result.rows[0];
	});
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */

const getAllProperties = function (options, limit = 10) {
	const queryParams = [];
	let queryString = `
		SELECT properties.*, avg(property_reviews.rating) AS average_rating
		FROM properties
		JOIN property_reviews ON properties.id = property_id
	`;

	if (options.city) {
		queryParams.push(`%${options.city}%`);
		queryString += `WHERE city LIKE $${queryParams.length} `;
	}

	if (options.owner_id) {
		queryParams.push(options.owner_id);
		queryString += `WHERE owner_id = $${queryParams.length} `;
	}

	if (options.minimum_price_per_night && options.maximum_price_per_night) {
		queryParams.push(options.minimum_price_per_night * 100); // Convert to cents
		queryParams.push(options.maximum_price_per_night * 100); // Convert to cents
		if (queryParams.length === 2) {
			queryString += `WHERE cost_per_night >= $${
				queryParams.length - 1
			} AND cost_per_night <= $${queryParams.length} `;
		} else {
			queryString += `AND cost_per_night >= $${
				queryParams.length - 1
			} AND cost_per_night <= $${queryParams.length} `;
		}
	}

	if (options.minimum_rating) {
		queryParams.push(options.minimum_rating);
		if (queryParams.length === 1) {
			queryString += `WHERE avg(property_reviews.rating) >= $${queryParams.length} `;
		} else {
			queryString += `AND avg(property_reviews.rating) >= $${queryParams.length} `;
		}
	}

	queryParams.push(limit);
	queryString += `
		GROUP BY properties.id
		ORDER BY cost_per_night
		LIMIT $${queryParams.length};
	`;

	console.log("queryString:", queryString, "queryParams:", queryParams);

	return pool.query(queryString, queryParams).then((res) => res.rows);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */

const addProperty = function (property) {
	const propertyId = Object.keys(properties).length + 1;
	property.id = propertyId;
	properties[propertyId] = property;
	return Promise.resolve(property);
};

module.exports = {
	getUserWithEmail,
	getUserWithId,
	addUser,
	getAllReservations,
	getAllProperties,
	addProperty,
};
