import { Column, Model, Table, DataType } from 'sequelize-typescript';

@Table({
    tableName: 'Podcast',
    timestamps: false,
    schema: 'public',
    modelName: 'Podcast',
})
export class Podcast extends Model {
    @Column({
        type: DataType.UUID,
        primaryKey: true,
        field: 'podcast_id',
    })
    podcastId: string;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'publish_date',
    })
    publishDate: Date;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    title: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    script: string;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
        field: 'timestamp_script',
    })
    timestampScript: object;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        field: 'audio_url',
    })
    audioUrl: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        field: 'length_seconds',
    })
    lengthSeconds: number;

    @Column({
        type: DataType.ARRAY(DataType.TEXT),
        allowNull: true,
        field: 'links',
    })
    links: string[];
}
