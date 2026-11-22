import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const PUBLIC_USER_FIELDS = [
    "_id",
    "fullName",
    "profilePic",
    "bio",
    "nativeLanguages",
    "learningLanguages",
    "country",
    "city",
    "interests",
    "createdAt",
].join(" ");

const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const isNonEmptyString = (value) => {
    return typeof value === "string" && value.trim().length > 0;
};

const isStringArray = (value) => {
    return (
        Array.isArray(value) &&
        value.every(
            (item) =>
                typeof item === "string" &&
                item.trim().length > 0
        )
    );
};

const parsePagination = (query) => {
    const page = Number.parseInt(query.page, 10) || 1;
    const limit = Number.parseInt(query.limit, 10) || 20;

    const pageNumber = Math.max(page, 1);
    const limitNumber = Math.min(Math.max(limit, 1), 50);

    return {
        page: pageNumber,
        limit: limitNumber,
        skip: (pageNumber - 1) * limitNumber,
    };
};


/*
|--------------------------------------------------------------------------
| GET CURRENT USER PROFILE
|--------------------------------------------------------------------------
*/

export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        res.status(200).json(user);

    } catch (error) {
        console.log(
            "Error in getProfile controller:",
            error.message
        );

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};


/*
|--------------------------------------------------------------------------
| GET USER BY ID
|--------------------------------------------------------------------------
|
| Used to view another user's public profile.
|
| GET /api/users/:id
|
*/

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        res.status(200).json(user);
    } catch (error) {
        console.log(
            "Error in getUserById controller:",
            error.message
        );

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};


/*
|--------------------------------------------------------------------------
| UPDATE PROFILE
|--------------------------------------------------------------------------
|
| PUT /api/users/profile
|
*/

export const updateProfile = async (req, res) => {
    try {
        const {
            fullName,
            bio,
            nativeLanguages,
            learningLanguages,
            country,
            city,
            interests,
            profilePic,
        } = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Full name
        |--------------------------------------------------------------------------
        */

        if (fullName !== undefined) {
            if (!isNonEmptyString(fullName)) {
                return res.status(400).json({
                    message: "Full name must be a valid string.",
                });
            }

            user.fullName = fullName.trim();
        }


        /*
        |--------------------------------------------------------------------------
        | Bio
        |--------------------------------------------------------------------------
        */

        if (bio !== undefined) {
            if (typeof bio !== "string") {
                return res.status(400).json({
                    message: "Bio must be a string.",
                });
            }

            user.bio = bio.trim();
        }


        /*
        |--------------------------------------------------------------------------
        | Native languages
        |--------------------------------------------------------------------------
        */

        if (nativeLanguages !== undefined) {
            if (!isStringArray(nativeLanguages)) {
                return res.status(400).json({
                    message:
                        "Native languages must be an array of strings.",
                });
            }

            user.nativeLanguages = nativeLanguages.map(
                (language) => language.trim()
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Learning languages
        |--------------------------------------------------------------------------
        */

        if (learningLanguages !== undefined) {
            if (!isStringArray(learningLanguages)) {
                return res.status(400).json({
                    message:
                        "Learning languages must be an array of strings.",
                });
            }

            user.learningLanguages = learningLanguages.map(
                (language) => language.trim()
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Country
        |--------------------------------------------------------------------------
        */

        if (country !== undefined) {
            if (typeof country !== "string") {
                return res.status(400).json({
                    message: "Country must be a string.",
                });
            }

            user.country = country.trim();
        }


        /*
        |--------------------------------------------------------------------------
        | City
        |--------------------------------------------------------------------------
        */

        if (city !== undefined) {
            if (typeof city !== "string") {
                return res.status(400).json({
                    message: "City must be a string.",
                });
            }

            user.city = city.trim();
        }


        /*
        |--------------------------------------------------------------------------
        | Interests
        |--------------------------------------------------------------------------
        */

        if (interests !== undefined) {
            if (!isStringArray(interests)) {
                return res.status(400).json({
                    message:
                        "Interests must be an array of strings.",
                });
            }

            user.interests = interests.map(
                (interest) => interest.trim()
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Profile picture
        |--------------------------------------------------------------------------
        */

        if (profilePic) {
            try {
                const uploadResponse =
                    await cloudinary.uploader.upload(profilePic);

                user.profilePic = uploadResponse.secure_url;

            } catch (uploadError) {
                console.error("Cloudinary upload error:", uploadError);

                return res.status(400).json({
                    message: "Failed to upload profile picture.",
                });
            }
        }


        /*
        |--------------------------------------------------------------------------
        | Save changes
        |--------------------------------------------------------------------------
        */

        const updatedUser = await user.save();

        res.status(200).json({
            _id: updatedUser._id,
            fullName: updatedUser.fullName,
            email: updatedUser.email,
            profilePic: updatedUser.profilePic,
            bio: updatedUser.bio,
            nativeLanguages: updatedUser.nativeLanguages,
            learningLanguages: updatedUser.learningLanguages,
            country: updatedUser.country,
            city: updatedUser.city,
            interests: updatedUser.interests,
        });

    } catch (error) {
        console.log(
            "Error in updateProfile controller:",
            error.message
        );

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};


/*
|--------------------------------------------------------------------------
| GET USERS / USER DISCOVERY
|--------------------------------------------------------------------------
|
| GET /api/users
|
| Query parameters:
|
| nativeLanguage
| learningLanguage
| country
| city
| interest
| page
| limit
|
*/

export const getUsers = async (req, res) => {
    try {
        const {
            nativeLanguage,
            learningLanguage,
            country,
            city,
            interest,
        } = req.query;

        const {
            page,
            limit,
            skip,
        } = parsePagination(req.query);


        /*
        |--------------------------------------------------------------------------
        | Base filter
        |--------------------------------------------------------------------------
        |
        | Don't show the current user.
        |
        */

        const filter = {
            _id: {
                $ne: req.user._id,
            },
        };


        /*
        |--------------------------------------------------------------------------
        | Native language
        |--------------------------------------------------------------------------
        */

        if (isNonEmptyString(nativeLanguage)) {
            filter.nativeLanguages = {
                $regex: `^${escapeRegex(
                    nativeLanguage.trim()
                )}$`,
                $options: "i",
            };
        }


        /*
        |--------------------------------------------------------------------------
        | Learning language
        |--------------------------------------------------------------------------
        */

        if (isNonEmptyString(learningLanguage)) {
            filter.learningLanguages = {
                $regex: `^${escapeRegex(
                    learningLanguage.trim()
                )}$`,
                $options: "i",
            };
        }


        /*
        |--------------------------------------------------------------------------
        | Country
        |--------------------------------------------------------------------------
        */

        if (isNonEmptyString(country)) {
            filter.country = {
                $regex: `^${escapeRegex(
                    country.trim()
                )}$`,
                $options: "i",
            };
        }


        /*
        |--------------------------------------------------------------------------
        | City
        |--------------------------------------------------------------------------
        */

        if (isNonEmptyString(city)) {
            filter.city = {
                $regex: `^${escapeRegex(
                    city.trim()
                )}$`,
                $options: "i",
            };
        }


        /*
        |--------------------------------------------------------------------------
        | Interest
        |--------------------------------------------------------------------------
        */

        if (isNonEmptyString(interest)) {
            filter.interests = {
                $regex: `^${escapeRegex(
                    interest.trim()
                )}$`,
                $options: "i",
            };
        }


        /*
        |--------------------------------------------------------------------------
        | Get users and total count
        |--------------------------------------------------------------------------
        */

        const [users, totalUsers] = await Promise.all([
            User.find(filter)
                .select(PUBLIC_USER_FIELDS)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            User.countDocuments(filter),
        ]);


        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

        res.status(200).json({
            users,
            page,
            limit,
            totalUsers,
            totalPages: Math.ceil(
                totalUsers / limit
            ),
        });

    } catch (error) {
        console.log(
            "Error in getUsers controller:",
            error.message
        );

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};


/*
|--------------------------------------------------------------------------
| GET LANGUAGE MATCHES
|--------------------------------------------------------------------------
|
| GET /api/users/matches
|
| Finds users whose:
|
| 1. Native language matches something I am learning.
|
| 2. Learning language matches something I speak.
|
*/

export const getLanguageMatches = async (req, res) => {
    try {
        const {
            page,
            limit,
            skip,
        } = parsePagination(req.query);


        /*
        |--------------------------------------------------------------------------
        | Get current user's languages
        |--------------------------------------------------------------------------
        */

        const currentUser = await User.findById(req.user._id)
            .select(
                "nativeLanguages learningLanguages"
            )
            .lean();

        if (!currentUser) {
            return res.status(404).json({
                message: "User not found",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Validate languages
        |--------------------------------------------------------------------------
        */

        if (
            !Array.isArray(
                currentUser.nativeLanguages
            ) ||
            currentUser.nativeLanguages.length === 0 ||
            !Array.isArray(
                currentUser.learningLanguages
            ) ||
            currentUser.learningLanguages.length === 0
        ) {
            return res.status(400).json({
                message:
                    "Please add your native and learning languages first.",
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Match filter
        |--------------------------------------------------------------------------
        */

        const filter = {
            _id: {
                $ne: req.user._id,
            },

            // They speak something I am learning.
            nativeLanguages: {
                $in: currentUser.learningLanguages,
            },

            // They are learning something I speak.
            learningLanguages: {
                $in: currentUser.nativeLanguages,
            },
        };


        /*
        |--------------------------------------------------------------------------
        | Get matches and total count
        |--------------------------------------------------------------------------
        */

        const [users, totalUsers] = await Promise.all([
            User.find(filter)
                .select(PUBLIC_USER_FIELDS)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            User.countDocuments(filter),
        ]);


        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

        res.status(200).json({
            users,
            page,
            limit,
            totalUsers,
            totalPages: Math.ceil(
                totalUsers / limit
            ),
        });

    } catch (error) {
        console.log(
            "Error in getLanguageMatches controller:",
            error.message
        );

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

