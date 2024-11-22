const MedicalInfo = require('../model/medicalModel');
const userInfo = require('../model/personalInfoModel');

const addInfo = async (req, res) => {
    const allowedFields = [
        "userId", "respiratory", "digestive", "nervous", "excretory", "endocrine", "circulatory",
        "skeletal", "muscular", "reproductive", "lymphatic", "psychological", "specifyPsychological",
        "smoking", "drinking", "allergy", "specificAllergy", "eyes", "ear", "nose", "throat", "tonsils",
        "teeth", "tongue", "neck", "thyroids", "cervicalGlands", "chest", "contour", "heart", "rate",
        "rhythm", "bp", "height", "weight", "bmi", "lungs", "abdomen", "ABcontour", "liver", "spleen",
        "kidneys", "extremities", "upperExtremities", "lowerExtremities", "bloodChemistry", "cbc",
        "urinalysis", "fecalysis", "chestXray", "others"
    ];

    const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));

    if (extraFields.length > 0) {
        return res.status(400).send({ error: `Extra fields are not allowed: ${extraFields.join(', ')}` });
    }

    try {
        const medicalInfo = new MedicalInfo(req.body);
        await medicalInfo.save();
        res.status(201).send(medicalInfo);
    } catch (error) {
        res.status(400).send(error);
    }
};

const getInfo = async (req, res) => {
    try {
        const medicalInfos = await MedicalInfo.find();
        res.status(200).send(medicalInfos);
    } catch (error) {
        res.status(500).send(error);
    }
};
const getUserInfo = async (req, res) => {
    try {
        const user = await userInfo.findById(req.params.id).populate('medicalInfo');
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }
        res.status(200).send({
            user,
            medicalInfo: user.medicalInfo
        });
    } catch (error) {
        res.status(500).send(error);
    }
};



const addPersonalInfo = async (req, res) => {
    try {
        const { body } = req;

        // Validate request body
        const requiredFields = [
            'firstname', 'lastname', 'age', 'section', 'sex', 'civilStatus',
            'birthDate', 'address', 'telNum', 'guardian', 'guardianAddress', 'guardianNum', 'department'
        ];
        const missingFields = requiredFields.filter(field => !body[field]);

        if (missingFields.length > 0) {
            return res.status(400).send({ error: `Missing required fields: ${missingFields.join(', ')}` });
        }

        const personalInfo = new userInfo(body);
        await personalInfo.save();
        res.status(201).send(personalInfo);
    } catch (error) {
        console.error('Error adding personal info:', error);
        res.status(400).send({ error: error.message });
    }
};
const getPersonalInfo = async (req, res) => {
    try {
        const users = await userInfo.find({}, 'firstname lastname age');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getMedicalInfo = async (req, res) => {
    try {
        const user = await userInfo.findById(req.params.id).populate('medicalInfo');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};


module.exports = { addInfo, getInfo, getUserInfo, addPersonalInfo, getPersonalInfo, getMedicalInfo }

