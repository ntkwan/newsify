import { Column, Model, Table } from 'sequelize-typescript';
import { DataTypes } from 'sequelize';

@Table({
    tableName: 'accounts',
    timestamps: true,
})
export class User extends Model {
    // Basic info
    @Column({
        primaryKey: true,
        unique: true,
        allowNull: false,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
    })
    declare id: string;

    @Column({
        type: DataTypes.STRING,
        allowNull: false,
    })
    username: string;

    @Column({
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    })
    email: string;

    @Column({
        type: DataTypes.STRING,
        allowNull: false,
    })
    password: string;

    @Column({
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    })
    declare createdAt: Date;

    @Column({
        type: DataTypes.DATE,
        allowNull: true,
    })
    declare updatedAt: Date;

    @Column({
        type: DataTypes.STRING,
        allowNull: true,
    })
    otp: string;

    @Column({
        type: DataTypes.DATE,
        allowNull: true,
    })
    otpExpiry: Date;
}
