package com.wsi.annotation.api.database.domain.tcga;

import com.wsi.annotation.api.database.domain.tcga.inner.InnerConsequence;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Document(value = "tcag_somatic_mutations")
public class TcgaSomaticMutations {
    @Id
    private String id;
    private String mutation_subtype;
    private String ssm_id;
    private String genomic_dna_change;
    private String case_id;
    private List<InnerConsequence> consequence;

}
