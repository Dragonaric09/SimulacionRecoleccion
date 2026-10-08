package com.simulacionem.encuesta.infrastructure.persistence.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "competence_catalog")
public class CompetenceCatalogEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 100)
    private String code;
    @Column(nullable = false, length = 180)
    private String name;
    @Column(name = "competence_group", nullable = false, length = 30)
    private String competenceGroup;
    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    protected CompetenceCatalogEntity() { }
    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getCompetenceGroup() { return competenceGroup; }
}
