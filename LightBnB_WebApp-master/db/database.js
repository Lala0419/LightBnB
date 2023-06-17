// const properties = require("./json/properties.json");
// const users = require("./json/users.json");
const pg = require("pg");
const Pool = pg.Pool;
const config = {
	host: process.env.DATABASE_HOST,
	port: process.env.DATABASE_PORT,
	database: process.env.DATABASE_NAME,
	password: process.env.DATABASE_PASSWORD,
	user: process.env.DATABASE_USERNAME,
};
console.log("config", config);
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

const getAllReservations = function (guest_id, limit = 10) {
	return pool
		.query(
			`
			SELECT reservations.*, properties.title as title, cost_per_night, avg(property_reviews.rating) as average_rating, number_of_bathrooms, parking_spaces, number_of_bedrooms, thumbnail_photo_url
			FROM reservations
			JOIN property_reviews ON reservation_id = reservations.id
			JOIN properties ON properties.id = reservations.property_id
			WHERE reservations.guest_id = $1
			GROUP BY reservations.id, properties.id
			ORDER BY start_date
			LIMIT $2
		`,
			[guest_id, limit]
		)
		.then((result) => {
			console.log("result:", result);
			return result.rows;
		});
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
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

	return pool.query(queryString, queryParams).then((res) => res.rows);
};
/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */

const addProperty = function (property) {
	const values = [
		property.title,
		property.description,
		property.owner_id,
		property.cover_photo_url,
		property.thumbnail_photo_url,
		property.cost_per_night,
		property.parking_spaces,
		property.number_of_bathrooms,
		property.number_of_bedrooms,
		property.province,
		property.city,
		property.country,
		property.street,
		property.post_code,
	];
	const queryString = `INSERT INTO properties (
    title, description, owner_id, cover_photo_url, thumbnail_photo_url, cost_per_night, parking_spaces, number_of_bathrooms, number_of_bedrooms, province, city, country, street, post_code)
	 VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	 RETURNING *;
		`;

	console.log("queryString:", queryString, "values:", values);
	return pool.query(queryString, values).then((result) => {
		return result.rows[0];
	});
};

module.exports = {
	getUserWithEmail,
	getUserWithId,
	addUser,
	getAllReservations,
	getAllProperties,
	addProperty,
};
