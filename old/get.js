//Script for getting all features.
jQuery.get("./api/v1/features/", function(data, textStatus, jqXHR) {
    console.log("Post resposne:");
    console.dir(data);
    console.log(textStatus);
    console.dir(jqXHR);
});

//Script for getting a single feature based on ObjectID.
jQuery.get("/api/products/4f34734d21289c1c28000007", function(data, textStatus, jqXHR) {
    console.log("Post resposne:");
    console.dir(data);
    console.log(textStatus);
    console.dir(jqXHR);
});