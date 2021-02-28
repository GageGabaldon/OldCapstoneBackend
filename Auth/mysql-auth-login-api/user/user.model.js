var DataTypes = require('sequelize');

module.exports = model;

function model(sequelize) {

    const attributes = {
        userID: {type: DataTypes.INTEGER, unique: true, primaryKey: true, autoIncrement: true},
        userName: { type: DataTypes.STRING(45), allowNull: true},
        userPhone: {type: DataTypes.STRING(10), unique: true, allowNull: true },
        userEmail: {type: DataTypes.STRING(254), unique: true, allowNull: false,primaryKey: true},
        userKey: {type: DataTypes.STRING(20), allowNull: false},
        userToken: { type: DataTypes.STRING(255), allowNull: false }
    };

    const options = {
        defaultScope: {
            // exclude hash by default
            attributes: { exclude: ['userToken'] }
        },
        scopes: {
            // include hash with this scope
            withHash: { attributes: {}, }
        }
    };

    

    return sequelize.define('User', attributes, options);
}