import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Fat {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    full_path: string;
    
    @Column()
    name: string;

    @Column()
    date_created: Date;

    @Column()
    date_modified: Date;

    @Column()
    isFolder: boolean;

    @Column({type:"bigint", default: 0 })
    size: number;

    @Column({type:"bigint", default: 0 })
    totalSize: number;

    @ManyToOne(()=> Fat, fat => fat.content, { nullable: true })
    @JoinColumn()
    previous: Fat;

    @OneToMany(()=> Fat, fat => fat.previous, { nullable: true })
    content: Fat[];
}